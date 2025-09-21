// Data migration script to populate Neon database with comprehensive sample data
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users, campaigns, scanEvents, notifications } from "@shared/schema";
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// Helper functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function migrateData() {
  console.log('🚀 Starting comprehensive data migration to Neon DB...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  
  const neonClient = neon(connectionString);
  const db = drizzle(neonClient);
  
  try {
    // Check if data already exists
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log(`⚠️  Database already has ${existingUsers.length} users. Skipping migration.`);
      console.log('💡 To force migration, clear the database first.');
      return;
    }
    
    console.log('📤 Creating comprehensive sample data...');
    
    // Create 5 users with different roles and statuses
    console.log('💾 Creating users...');
    const userMigrationData = [
      {
        id: randomUUID(),
        username: "Suraj Kumar",
        password: await bcrypt.hash("Passsword@123", 10),
        isActive: true,
        isAdmin: true,
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        username: "Rajesh Singh", 
        password: await bcrypt.hash("password123", 10),
        isActive: true,
        isAdmin: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: randomUUID(),
        username: "Priya Sharma",
        password: await bcrypt.hash("password123", 10), 
        isActive: true,
        isAdmin: false,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      },
      {
        id: randomUUID(),
        username: "Amit Patel",
        password: await bcrypt.hash("password123", 10),
        isActive: true,
        isAdmin: false,
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
      },
      {
        id: randomUUID(),
        username: "Inactive User",
        password: await bcrypt.hash("password123", 10),
        isActive: false,
        isAdmin: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    ];
    
    for (const userData of userMigrationData) {
      await db.insert(users).values(userData);
    }
    
    console.log(`✅ Created ${userMigrationData.length} users`);
    
    // Create comprehensive campaigns with realistic data
    console.log('💾 Creating campaigns...');
    const now = new Date();
    const campaignMigrationData = [
      {
        id: randomUUID(),
        name: "Summer Product Launch",
        category: "Product",
        description: "Launching our new summer collection with interactive QR codes",
        scanCount: 0,
        scanLimit: 1000,
        status: "active" as const,
        startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[0].id, // Suraj Kumar
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        imageUrl: "https://example.com/summer-launch.jpg",
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Tech Conference 2024",
        category: "Event",
        description: "QR codes for booth check-ins and session attendance",
        scanCount: 0,
        scanLimit: 500,
        status: "active" as const,
        startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[1].id, // Rajesh Singh
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        imageUrl: "https://example.com/tech-conf.jpg",
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Restaurant Menu QR",
        category: "Menu",
        description: "Digital menu access for our restaurant",
        scanCount: 0,
        scanLimit: 2000,
        status: "active" as const,
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[2].id, // Priya Sharma
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Customer Feedback Survey",
        category: "Survey",
        description: "Collecting customer feedback through QR codes",
        scanCount: 0,
        scanLimit: 300,
        status: "active" as const,
        startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[3].id, // Amit Patel
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Holiday Promotion",
        category: "Marketing",
        description: "Special holiday offers with QR code discounts",
        scanCount: 0,
        scanLimit: 800,
        status: "active" as const,
        startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[0].id, // Suraj Kumar
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Expired Event Campaign",
        category: "Event",
        description: "This campaign has already ended",
        scanCount: 0,
        scanLimit: 200,
        status: "expired" as const,
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[1].id, // Rajesh Singh
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      // Campaigns for notification testing
      {
        id: randomUUID(),
        name: "Flash Sale Ending Today",
        category: "Marketing",
        description: "Last chance flash sale - expires today!",
        scanCount: 0,
        scanLimit: 100,
        status: "active" as const,
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        createdBy: userMigrationData[0].id, // Suraj Kumar (admin)
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Event Registration Closes Tomorrow",
        category: "Event",
        description: "Conference registration ending tomorrow",
        scanCount: 0,
        scanLimit: 150,
        status: "active" as const,
        startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        createdBy: userMigrationData[2].id, // Priya Sharma
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Survey Almost Full",
        category: "Survey",
        description: "Customer feedback survey - only 2 responses left!",
        scanCount: 48, // 2 scans left out of 50
        scanLimit: 50,
        status: "active" as const,
        startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[3].id, // Amit Patel
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Contest Registration Full",
        category: "Contest",
        description: "Photography contest - registration limit reached",
        scanCount: 25, // Limit reached
        scanLimit: 25,
        status: "active" as const,
        startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[0].id, // Suraj Kumar
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      },
      {
        id: randomUUID(),
        name: "Product Demo Slots - 1 Left",
        category: "Event",
        description: "Product demonstration booking - almost full",
        scanCount: 29, // 1 scan left
        scanLimit: 30,
        status: "active" as const,
        startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        createdBy: userMigrationData[0].id, // Suraj Kumar (admin)
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        imageUrl: null,
        iconPath: null,
        borderStyle: "none" as const,
        targetUrl: null
      }
    ];
    
    for (const campaignData of campaignMigrationData) {
      await db.insert(campaigns).values(campaignData);
    }
    
    console.log(`✅ Created ${campaignMigrationData.length} campaigns`);
    
    // Generate realistic scan events
    console.log('💾 Generating scan events...');
    const regions = ["North America", "Europe", "Asia", "South America", "Africa", "Oceania"];
    const userAgents = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    ];
    
    
    let totalScanEvents = 0;
    
    for (const campaign of campaignMigrationData) {
      // Generate different numbers of scans based on campaign type and status
      let numScans;
      
      if (campaign.scanCount > 0) {
        // Use pre-set scan count for testing campaigns
        numScans = campaign.scanCount;
      } else {
        // Generate random scan counts based on category
        if (campaign.category === "Menu") {
          numScans = randomInt(180, 250);
        } else if (campaign.category === "Event") {
          numScans = randomInt(80, 150);
        } else if (campaign.category === "Marketing") {
          numScans = randomInt(120, 200);
        } else {
          numScans = randomInt(60, 120);
        }
        
        // Reduce for expired campaigns
        if (campaign.status === 'expired') {
          numScans = Math.floor(numScans * 0.7);
        }
      }
      
      // Generate scan events
      for (let i = 0; i < numScans; i++) {
        let scanTime;
        if (campaign.status === 'expired') {
          // Scans occurred between start and end date
          const timeRange = campaign.endDate.getTime() - campaign.startDate.getTime();
          scanTime = new Date(campaign.startDate.getTime() + Math.random() * timeRange);
        } else {
          // Scans are more recent (last 15 days)
          const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
          const timeRange = Date.now() - Math.max(fifteenDaysAgo, campaign.startDate.getTime());
          scanTime = new Date(campaign.startDate.getTime() + Math.random() * timeRange);
        }
        
        await db.insert(scanEvents).values({
          id: randomUUID(),
          campaignId: campaign.id,
          region: getRandomElement(regions),
          scannedAt: scanTime,
          userAgent: getRandomElement(userAgents),
          ipAddress: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`
        });
        totalScanEvents++;
      }
      
      // Update campaign scan count
      await db.update(campaigns)
        .set({ scanCount: numScans })
        .where(eq(campaigns.id, campaign.id));
      
      console.log(`  📊 Generated ${numScans} scan events for campaign "${campaign.name}"`);
    }
    
    console.log(`✅ Generated ${totalScanEvents} scan events total`);
    
    console.log('🎉 Data migration completed successfully!');
    console.log('📈 Migration Summary:');
    console.log(`   👥 Users: ${userMigrationData.length}`);
    console.log(`   📋 Campaigns: ${campaignMigrationData.length}`);
    console.log(`   📊 Scan Events: ${totalScanEvents}`);
    console.log('');
    console.log('🔄 Next step: Application will use database storage automatically');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use as a module
export { migrateData };

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData().catch(console.error);
}