import { db } from "./db";
import { users } from "@shared/schema";
import { logger } from "./logger";
import bcrypt from "bcryptjs";

interface SeedUser {
  username: string;
  password: string;
}

const SEED_USERS: SeedUser[] = [
  { username: "admin", password: process.env.SEED_ADMIN_PASSWORD || "admin123" },
  { username: "user1", password: process.env.SEED_USER1_PASSWORD || "password1" },
  { username: "demo", password: process.env.SEED_DEMO_PASSWORD || "demo123" }
];

async function seedUsers() {
  try {
    logger.info("Starting user seeding process");

    // Check if users already exist
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length > 0) {
      logger.info(`Database already has ${existingUsers.length} users, skipping seed`);
      return;
    }

    // Create seed users
    for (const seedUser of SEED_USERS) {
      try {
        const hashedPassword = await bcrypt.hash(seedUser.password, 10);
        
        const [createdUser] = await db
          .insert(users)
          .values({
            username: seedUser.username,
            password: hashedPassword
          })
          .returning();

        logger.info(`Created seed user: ${createdUser.username}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          logger.warn(`User ${seedUser.username} already exists, skipping`);
        } else {
          logger.error(`Failed to create user ${seedUser.username}`, { error });
        }
      }
    }

    logger.info("User seeding completed successfully");
  } catch (error) {
    logger.error("Failed to seed users", { error });
    throw error;
  }
}

async function seedDatabase() {
  try {
    logger.info("Starting database seeding");
    
    await seedUsers();
    
    logger.info("Database seeding completed successfully");
  } catch (error) {
    logger.error("Database seeding failed", { error });
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase().then(() => {
    logger.info("Seeding process finished");
    process.exit(0);
  });
}

export { seedDatabase, seedUsers };