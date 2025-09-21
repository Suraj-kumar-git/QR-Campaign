import { db } from './db';
import { campaigns, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function seedCampaigns() {
  // Check if campaigns already exist to avoid duplicate seeding
  const existingCampaigns = await db.select().from(campaigns).limit(1);
  if (existingCampaigns.length > 0) {
    console.log('Campaigns already seeded');
    return;
  }

  // Get the first user to assign as creator
  const [firstUser] = await db.select().from(users).limit(1);
  if (!firstUser) {
    console.log('No users found. Please create a user first.');
    return;
  }

  const sampleCampaigns = [
    {
      name: "Summer Product Launch",
      category: "contest",
      status: "active" as const,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-08-31'),
      createdBy: firstUser.id,
      scanCount: 1247,
      imageUrl: null,
    },
    {
      name: "Charity Fundraiser",
      category: "NGO",
      status: "active" as const,
      startDate: new Date('2024-05-15'),
      endDate: new Date('2024-12-31'),
      createdBy: firstUser.id,
      scanCount: 856,
      imageUrl: null,
    },
    {
      name: "Payment Gateway Integration",
      category: "payment",
      status: "active" as const,
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-09-30'),
      createdBy: firstUser.id,
      scanCount: 2103,
      imageUrl: null,
    },
    {
      name: "Winter Holiday Contest",
      category: "contest",
      status: "active" as const,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2025-01-15'),
      createdBy: firstUser.id,
      scanCount: 423,
      imageUrl: null,
    },
    {
      name: "Mobile App Downloads",
      category: "contest",
      status: "active" as const,
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-10-31'),
      createdBy: firstUser.id,
      scanCount: 1689,
      imageUrl: null,
    },
    {
      name: "Customer Survey Campaign",
      category: "contest",
      status: "active" as const,
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-06-15'),
      createdBy: firstUser.id,
      scanCount: 312,
      imageUrl: null,
    },
  ];

  try {
    await db.insert(campaigns).values(sampleCampaigns);
    console.log('Sample campaigns seeded successfully');
  } catch (error) {
    console.error('Error seeding campaigns:', error);
  }
}