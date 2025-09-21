import { users, campaigns, scanEvents, notifications, type User, type InsertUser, type SafeUser, type Campaign, type InsertCampaign, type UpdateCampaign, type InsertScanEvent, type ScanEvent, type CampaignAnalytics, type RegionAnalytics, type HourlyAnalytics, type UpdateUserStatus, type CreateUserByAdmin, type ChangePassword, type Notification, type InsertNotification } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, desc, asc, sql, and, or, count, sum } from 'drizzle-orm';
import 'dotenv/config';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<SafeUser>;
  createUserByAdmin(userData: CreateUserByAdmin): Promise<SafeUser>;
  getUsers(): Promise<SafeUser[]>;
  updateUserStatus(id: string, status: UpdateUserStatus): Promise<SafeUser | undefined>;
  validateUser(username: string, password: string): Promise<SafeUser | null>;
  changePassword(userId: string, passwordData: { oldPassword: string; newPassword: string }): Promise<void>;

  // Campaign operations
  getLiveCampaigns(page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', filterCategory?: string, filterUser?: string): Promise<{ campaigns: Campaign[], pagination: { page: number, limit: number, total: number, totalPages: number } }>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(insertCampaign: InsertCampaign & { createdBy: string }): Promise<Campaign>;
  updateCampaign(id: string, updateCampaign: UpdateCampaign): Promise<Campaign | undefined>;
  updateCampaignScanCount(id: string): Promise<{ success: boolean; reason?: string }>;
  getCampaignCategories(): Promise<string[]>;
  getCampaignUsers(): Promise<{id: string, username: string}[]>;
  
  // Analytics operations
  recordScanEvent(insertScanEvent: InsertScanEvent): Promise<ScanEvent>;
  getCampaignAnalytics(campaignId: string, date: string): Promise<CampaignAnalytics>;
  getScanRecords(campaignId: string): Promise<ScanEvent[]>;
  getOverallStats(): Promise<{ totalCampaigns: number; totalScans: number; activeCampaigns: number; expiredCampaigns: number }>;
  getUserStats(userId: string): Promise<{ totalCampaigns: number; totalScans: number; activeCampaigns: number; expiredCampaigns: number; createdAt: string }>;
  
  // New analytics methods
  getAnalyticsOverall(): Promise<{ totalCampaigns: number; totalScans: number; totalUsers: number; activeCampaigns: number; avgScansPerCampaign: number }>;
  getTopCampaigns(): Promise<{ id: string; name: string; scanCount: number; category: string; createdAt: string }[]>;
  getRegionStats(): Promise<{ region: string; scanCount: number; percentage: number }[]>;
  getUserGrowthStats(): Promise<{ month: string; userCount: number; campaignCount: number }[]>;
  
  // Method to add new scan events while preserving existing data
  addNewScanEvents(): Promise<{ added: number; total: number }>;
  
  // Admin notification methods
  getAdminNotifications(): Promise<{
    expiring: { id: string; name: string; category: string; endDate: string; daysLeft: number; createdByUsername: string }[];
    scanLimitReached: { id: string; name: string; category: string; scanCount: number; scanLimit: number; createdByUsername: string }[];
  }>;
  
  // New notification system methods
  getUserNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;
  generateNotificationsForAdmins(): Promise<{ created: number; total: number }>;
}

// In-memory storage implementation
class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private campaigns: Map<string, Campaign> = new Map();
  private scanEvents: Map<string, ScanEvent> = new Map();
  private notifications: Map<string, Notification> = new Map();

  constructor() {
    // Initialize with your specified user
    this.initializeData();
  }

  private initializeData() {
    // Create 5 users: 4 active and 1 inactive
    
    // 1. Add Suraj Kumar (admin) with the specified password
    const hashedPassword1 = bcrypt.hashSync("Passsword@123", 10);
    const userId1 = randomUUID();
    const user1: User = {
      id: userId1,
      username: "Suraj Kumar",
      password: hashedPassword1,
      isActive: true,
      isAdmin: true, // Making admin for full access
      createdAt: new Date(),
    };
    this.users.set(userId1, user1);

    // 2. Add second active user
    const hashedPassword2 = bcrypt.hashSync("password123", 10);
    const userId2 = randomUUID();
    const user2: User = {
      id: userId2,
      username: "Rajesh Singh",
      password: hashedPassword2,
      isActive: true,
      isAdmin: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    };
    this.users.set(userId2, user2);

    // 3. Add third active user
    const hashedPassword3 = bcrypt.hashSync("secure456", 10);
    const userId3 = randomUUID();
    const user3: User = {
      id: userId3,
      username: "Priya Sharma",
      password: hashedPassword3,
      isActive: true,
      isAdmin: false,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    };
    this.users.set(userId3, user3);

    // 4. Add fourth active user
    const hashedPassword4 = bcrypt.hashSync("mypass789", 10);
    const userId4 = randomUUID();
    const user4: User = {
      id: userId4,
      username: "Amit Patel",
      password: hashedPassword4,
      isActive: true,
      isAdmin: false,
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 3 weeks ago
    };
    this.users.set(userId4, user4);

    // 5. Add one inactive user
    const hashedPassword5 = bcrypt.hashSync("inactive123", 10);
    const userId5 = randomUUID();
    const user5: User = {
      id: userId5,
      username: "Inactive User",
      password: hashedPassword5,
      isActive: false,
      isAdmin: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    };
    this.users.set(userId5, user5);

    // Initialize campaigns with comprehensive data across different users
    this.initializeCampaigns();
    
    // Generate scan events with better distribution
    this.generateEnrichedScanEvents();
  }

  private initializeCampaigns() {
    const now = new Date();
    const campaigns = [
      {
        name: "Summer Product Launch",
        category: "Product",
        description: "Launching our new summer collection with interactive QR codes",
        startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        scanLimit: 1000,
        createdBy: Array.from(this.users.values())[0].id, // Suraj Kumar
        imageUrl: "https://example.com/summer-launch.jpg"
      },
      {
        name: "Tech Conference 2024",
        category: "Event",
        description: "QR codes for booth check-ins and session attendance",
        startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        scanLimit: 500,
        createdBy: Array.from(this.users.values())[1].id, // Rajesh Singh
        imageUrl: "https://example.com/tech-conf.jpg"
      },
      {
        name: "Restaurant Menu QR",
        category: "Menu",
        description: "Digital menu access for our restaurant",
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        scanLimit: 2000,
        createdBy: Array.from(this.users.values())[2].id, // Priya Sharma
      },
      {
        name: "Customer Feedback Survey",
        category: "Survey",
        description: "Collecting customer feedback through QR codes",
        startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        scanLimit: 300,
        createdBy: Array.from(this.users.values())[3].id, // Amit Patel
      },
      {
        name: "Holiday Promotion",
        category: "Marketing",
        description: "Special holiday offers with QR code discounts",
        startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        scanLimit: 800,
        createdBy: Array.from(this.users.values())[0].id, // Suraj Kumar
      },
      {
        name: "Expired Event Campaign",
        category: "Event",
        description: "This campaign has already ended",
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (expired)
        scanLimit: 200,
        createdBy: Array.from(this.users.values())[1].id, // Rajesh Singh
      },
      // EXPIRING CAMPAIGNS - for notification testing
      {
        name: "Flash Sale Ending Today",
        category: "Marketing",
        description: "Last chance flash sale - expires today!",
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now (today)
        scanLimit: 100,
        createdBy: Array.from(this.users.values())[0].id, // Suraj Kumar (admin)
      },
      {
        name: "Event Registration Closes Tomorrow",
        category: "Event", 
        description: "Conference registration ending tomorrow",
        startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day from now (tomorrow)
        scanLimit: 150,
        createdBy: Array.from(this.users.values())[2].id, // Priya Sharma
      },
      {
        name: "Limited Time Offer - 24hrs Left", 
        category: "Marketing",
        description: "Special discount ending tomorrow",
        startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // Tomorrow evening
        scanLimit: 75,
        createdBy: Array.from(this.users.values())[1].id, // Rajesh Singh
      },
      // SCAN LIMIT CAMPAIGNS - for notification testing
      {
        name: "Survey Almost Full",
        category: "Survey",
        description: "Customer feedback survey - only 2 responses left!",
        startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        scanLimit: 50,
        scanCount: 48, // 2 scans left
        createdBy: Array.from(this.users.values())[3].id, // Amit Patel
      },
      {
        name: "Contest Registration Full",
        category: "Contest",
        description: "Photography contest - registration limit reached",
        startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        scanLimit: 25,
        scanCount: 25, // Limit reached
        createdBy: Array.from(this.users.values())[4].id, // Neha Gupta
      },
      {
        name: "Product Demo Slots - 1 Left",
        category: "Event",
        description: "Product demonstration booking - almost full",
        startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        scanLimit: 30,
        scanCount: 29, // 1 scan left
        createdBy: Array.from(this.users.values())[0].id, // Suraj Kumar (admin)
      }
    ];

    campaigns.forEach((campaignData, index) => {
      const campaignId = randomUUID();
      const campaign: Campaign = {
        id: campaignId,
        name: campaignData.name,
        category: campaignData.category,
        description: campaignData.description,
        scanCount: (campaignData as any).scanCount || 0, // Use pre-set scanCount if provided
        scanLimit: campaignData.scanLimit,
        status: now > campaignData.endDate ? 'expired' : 'active',
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
        createdBy: campaignData.createdBy,
        createdAt: campaignData.startDate,
        updatedAt: campaignData.startDate,
        imageUrl: campaignData.imageUrl || null,
        iconPath: null,
        borderStyle: "none",
        targetUrl: null,
        createdByUsername: null // Will be populated in getLiveCampaigns
      };
      this.campaigns.set(campaignId, campaign);
      
    });

    console.log(`✅ Initialized ${campaigns.length} campaigns with varied statuses and users`);
  }

  private generateEnrichedScanEvents() {
    const regions = ["North America", "Europe", "Asia", "South America", "Africa", "Oceania"];
    const userAgents = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    ];

    function getRandomElement<T>(array: T[]): T {
      return array[Math.floor(Math.random() * array.length)];
    }

    function randomInt(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let totalScanEvents = 0;
    const startedCampaigns = Array.from(this.campaigns.values()).filter(c => 
      c.status === 'active' || c.status === 'expired'
    );

    startedCampaigns.forEach(campaign => {
      // For campaigns with pre-set scan counts, use that count
      let numScans;
      if (campaign.scanCount > 0) {
        numScans = campaign.scanCount;
        console.log(`Campaign '${campaign.name}' generating ${numScans} scan events (pre-set for testing)`);
      } else {
        // Generate different numbers of scans based on campaign type and age
        if (campaign.category === "Menu") {
          numScans = randomInt(180, 250); // Restaurants get steady traffic
        } else if (campaign.category === "Event") {
          numScans = randomInt(80, 150); // Events have burst patterns
        } else if (campaign.category === "Marketing") {
          numScans = randomInt(120, 200); // Marketing campaigns vary
        } else {
          numScans = randomInt(60, 120); // Default range
        }

        // If campaign is expired, reduce scan count
        if (campaign.status === 'expired') {
          numScans = Math.floor(numScans * 0.7); // 30% reduction for expired
        }
      }

      for (let i = 0; i < numScans; i++) {
        // Generate scan times within the campaign period
        let scanTime;
        if (campaign.status === 'expired') {
          // For expired campaigns, scans occurred between start and end date
          const timeRange = campaign.endDate.getTime() - campaign.startDate.getTime();
          scanTime = new Date(campaign.startDate.getTime() + Math.random() * timeRange);
        } else {
          // For active campaigns, scans are more recent (last 15 days)
          const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
          const timeRange = Date.now() - Math.max(fifteenDaysAgo, campaign.startDate.getTime());
          scanTime = new Date(campaign.startDate.getTime() + Math.random() * timeRange);
        }
        
        const scanEvent: ScanEvent = {
          id: randomUUID(),
          campaignId: campaign.id,
          region: getRandomElement(regions),
          scannedAt: scanTime,
          userAgent: getRandomElement(userAgents),
          ipAddress: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}` // Mock IP
        };
        
        this.scanEvents.set(scanEvent.id, scanEvent);
        totalScanEvents++;
      }
      
      // Update campaign scan count
      campaign.scanCount = numScans;
      console.log(`Campaign '${campaign.name}' now has ${numScans} scan events (Status: ${campaign.status})`);
    });

    console.log(`✅ Generated ${totalScanEvents} enriched scan events across ${startedCampaigns.length} campaigns`);
    console.log(`📊 Scan events focused on recent activity for better analytics visualization`);
    
    // Log some statistics
    const activeCampaigns = startedCampaigns.filter(c => c.status === 'active').length;
    const expiredCampaigns = startedCampaigns.filter(c => c.status === 'expired').length;
    console.log(`📈 Active campaigns with scan data: ${activeCampaigns}`);
    console.log(`📉 Expired campaigns with scan data: ${expiredCampaigns}`);
  }

  // User operations
  async getUser(id: string): Promise<SafeUser | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: hashedPassword,
      isActive: insertUser.isActive ?? true,
      isAdmin: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async createUserByAdmin(userData: CreateUserByAdmin): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const id = randomUUID();
    const user: User = {
      id,
      username: userData.username,
      password: hashedPassword,
      isActive: userData.isActive ?? true,
      isAdmin: userData.isAdmin || false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async getUsers(): Promise<SafeUser[]> {
    const users = Array.from(this.users.values());
    return users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  async updateUserStatus(id: string, status: UpdateUserStatus): Promise<SafeUser | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    user.isActive = status.isActive;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async validateUser(username: string, password: string): Promise<SafeUser | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async changePassword(userId: string, passwordData: { oldPassword: string; newPassword: string }): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isOldPasswordValid = await bcrypt.compare(passwordData.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const isSamePassword = await bcrypt.compare(passwordData.newPassword, user.password);
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    user.password = await bcrypt.hash(passwordData.newPassword, 10);
  }

  // Campaign operations
  async getLiveCampaigns(
    page: number = 1, 
    limit: number = 12, 
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    filterCategory?: string,
    filterUser?: string
  ): Promise<{ campaigns: Campaign[], pagination: { page: number, limit: number, total: number, totalPages: number } }> {
    let campaigns = Array.from(this.campaigns.values())
      .filter(campaign => campaign.status === 'active');

    // Apply filters
    if (filterCategory) {
      campaigns = campaigns.filter(campaign => campaign.category === filterCategory);
    }

    if (filterUser) {
      campaigns = campaigns.filter(campaign => campaign.createdBy === filterUser);
    }

    // Sort campaigns
    campaigns.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'category':
          aVal = a.category.toLowerCase();
          bVal = b.category.toLowerCase();
          break;
        case 'scanCount':
          aVal = a.scanCount;
          bVal = b.scanCount;
          break;
        case 'startDate':
          aVal = a.startDate.getTime();
          bVal = b.startDate.getTime();
          break;
        default: // createdAt
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = campaigns.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedCampaigns = campaigns.slice(offset, offset + limit);

    // Add username to each campaign
    const campaignsWithUsernames = paginatedCampaigns.map(campaign => {
      const user = this.users.get(campaign.createdBy);
      return {
        ...campaign,
        createdByUsername: user?.username || null
      };
    });

    return {
      campaigns: campaignsWithUsernames,
      pagination: { page, limit, total, totalPages }
    };
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const user = this.users.get(campaign.createdBy);
    return {
      ...campaign,
      createdByUsername: user?.username || null
    };
  }

  async getCampaignCategories(): Promise<string[]> {
    const categories = new Set<string>();
    for (const campaign of Array.from(this.campaigns.values())) {
      if (campaign.status === 'active') {
        categories.add(campaign.category);
      }
    }
    return Array.from(categories);
  }

  async getCampaignUsers(): Promise<{id: string, username: string}[]> {
    const userIds = new Set<string>();
    for (const campaign of Array.from(this.campaigns.values())) {
      if (campaign.status === 'active') {
        userIds.add(campaign.createdBy);
      }
    }
    
    const result: {id: string, username: string}[] = [];
    for (const userId of Array.from(userIds)) {
      const user = this.users.get(userId);
      if (user) {
        result.push({ id: userId, username: user.username });
      }
    }
    return result;
  }

  async createCampaign(insertCampaign: InsertCampaign & { createdBy: string }): Promise<Campaign> {
    const id = randomUUID();
    const now = new Date();
    const campaign: Campaign = {
      id,
      name: insertCampaign.name,
      category: insertCampaign.category,
      description: insertCampaign.description || null,
      scanCount: 0,
      scanLimit: insertCampaign.scanLimit || null,
      status: 'active',
      startDate: insertCampaign.startDate,
      endDate: insertCampaign.endDate,
      createdBy: insertCampaign.createdBy,
      createdAt: now,
      updatedAt: now,
      imageUrl: insertCampaign.imageUrl || null,
      iconPath: insertCampaign.iconPath || null,
      borderStyle: insertCampaign.borderStyle || "none",
      targetUrl: insertCampaign.targetUrl ?? null,
      createdByUsername: null
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, updateCampaign: UpdateCampaign): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;

    Object.assign(campaign, { ...updateCampaign, updatedAt: new Date() });
    return campaign;
  }

  async updateCampaignScanCount(id: string): Promise<{ success: boolean; reason?: string }> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      return { success: false, reason: "Campaign not found" };
    }

    if (campaign.scanLimit && campaign.scanCount >= campaign.scanLimit) {
      return { success: false, reason: "Scan limit reached" };
    }

    if (campaign.status !== 'active') {
      return { success: false, reason: "Campaign is not active" };
    }

    campaign.scanCount += 1;
    return { success: true };
  }

  // Analytics operations
  async recordScanEvent(insertScanEvent: InsertScanEvent): Promise<ScanEvent> {
    const id = randomUUID();
    const scanEvent: ScanEvent = {
      id,
      campaignId: insertScanEvent.campaignId,
      region: insertScanEvent.region,
      userAgent: insertScanEvent.userAgent ?? null,
      ipAddress: insertScanEvent.ipAddress ?? null,
      scannedAt: new Date()
    };
    
    // Record the scan event
    this.scanEvents.set(id, scanEvent);
    
    // Increment the campaign scan count
    await this.updateCampaignScanCount(insertScanEvent.campaignId);
    
    return scanEvent;
  }

  async getCampaignAnalytics(campaignId: string, date: string): Promise<CampaignAnalytics> {
    // Convert "today" string to actual current date
    let targetDate: Date;
    if (date === "today") {
      targetDate = new Date();
      // Set to start of day to ensure proper date comparison
      targetDate.setHours(0, 0, 0, 0);
    } else {
      targetDate = new Date(date);
    }
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const scanEvents = Array.from(this.scanEvents.values())
      .filter(event => 
        event.campaignId === campaignId &&
        event.scannedAt >= targetDate &&
        event.scannedAt < nextDay
      );

    const totalScans = scanEvents.length;

    // Calculate hourly data (convert UTC to IST: UTC+5:30)
    const hourlyData: HourlyAnalytics[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const scans = scanEvents.filter(event => {
        // Convert UTC timestamp to IST by adding 5.5 hours
        const istDate = new Date(event.scannedAt.getTime() + (5.5 * 60 * 60 * 1000));
        return istDate.getHours() === hour;
      }).length;
      hourlyData.push({ hour, count: scans });
    }

    // Calculate region data
    const regionMap = new Map<string, number>();
    scanEvents.forEach(event => {
      regionMap.set(event.region, (regionMap.get(event.region) || 0) + 1);
    });

    const regionData: RegionAnalytics[] = Array.from(regionMap.entries()).map(([region, count]) => ({
      region,
      count
    }));

    return {
      totalScans,
      hourlyData,
      regionData,
      date
    };
  }

  async getScanRecords(campaignId: string): Promise<ScanEvent[]> {
    return Array.from(this.scanEvents.values())
      .filter(event => event.campaignId === campaignId)
      .sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime());
  }

  async getOverallStats(): Promise<{ totalCampaigns: number; totalScans: number; activeCampaigns: number; expiredCampaigns: number }> {
    const campaigns = Array.from(this.campaigns.values());
    const totalCampaigns = campaigns.length;
    const totalScans = Array.from(this.scanEvents.values()).length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const expiredCampaigns = campaigns.filter(c => c.status === 'expired').length;

    return {
      totalCampaigns,
      totalScans,
      activeCampaigns,
      expiredCampaigns
    };
  }

  async getUserStats(userId: string): Promise<{ totalCampaigns: number; totalScans: number; activeCampaigns: number; expiredCampaigns: number; createdAt: string }> {
    const userCampaigns = Array.from(this.campaigns.values()).filter(c => c.createdBy === userId);
    const totalCampaigns = userCampaigns.length;
    const activeCampaigns = userCampaigns.filter(c => c.status === 'active').length;
    const expiredCampaigns = userCampaigns.filter(c => c.status === 'expired').length;

    const userCampaignIds = new Set(userCampaigns.map(c => c.id));
    const totalScans = Array.from(this.scanEvents.values())
      .filter(event => userCampaignIds.has(event.campaignId)).length;

    return {
      totalCampaigns,
      totalScans,
      activeCampaigns,
      expiredCampaigns,
      createdAt: new Date().toISOString()
    };
  }

  // New analytics methods
  async getAnalyticsOverall(): Promise<{ totalCampaigns: number; totalScans: number; totalUsers: number; activeCampaigns: number; avgScansPerCampaign: number }> {
    const totalCampaigns = this.campaigns.size;
    const totalScans = this.scanEvents.size;
    const totalUsers = this.users.size;
    const activeCampaigns = Array.from(this.campaigns.values()).filter(c => c.status === 'active').length;
    const avgScansPerCampaign = totalCampaigns > 0 ? totalScans / totalCampaigns : 0;

    return {
      totalCampaigns,
      totalScans,
      totalUsers,
      activeCampaigns,
      avgScansPerCampaign
    };
  }

  async getTopCampaigns(): Promise<{ id: string; name: string; scanCount: number; category: string; createdAt: string }[]> {
    return Array.from(this.campaigns.values())
      .sort((a, b) => b.scanCount - a.scanCount)
      .slice(0, 10)
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        scanCount: campaign.scanCount,
        category: campaign.category,
        createdAt: campaign.createdAt.toISOString()
      }));
  }

  async getRegionStats(): Promise<{ region: string; scanCount: number; percentage: number }[]> {
    const regionMap = new Map<string, number>();
    const totalScans = this.scanEvents.size;

    Array.from(this.scanEvents.values()).forEach(event => {
      regionMap.set(event.region, (regionMap.get(event.region) || 0) + 1);
    });

    return Array.from(regionMap.entries()).map(([region, scanCount]) => ({
      region,
      scanCount,
      percentage: totalScans > 0 ? (scanCount / totalScans) * 100 : 0
    }));
  }

  async getUserGrowthStats(): Promise<{ month: string; userCount: number; campaignCount: number }[]> {
    const monthlyData = new Map<string, { userCount: number; campaignCount: number }>();

    // Process users
    Array.from(this.users.values()).forEach(user => {
      const month = user.createdAt.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyData.get(month) || { userCount: 0, campaignCount: 0 };
      existing.userCount += 1;
      monthlyData.set(month, existing);
    });

    // Process campaigns
    Array.from(this.campaigns.values()).forEach(campaign => {
      const month = campaign.createdAt.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyData.get(month) || { userCount: 0, campaignCount: 0 };
      existing.campaignCount += 1;
      monthlyData.set(month, existing);
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async addNewScanEvents(): Promise<{ added: number; total: number }> {
    const currentScanCount = this.scanEvents.size;
    console.log(`📊 Current scan events before adding new ones: ${currentScanCount}`);
    
    const regions = ["North America", "Europe", "Asia", "South America", "Africa", "Oceania"];
    const userAgents = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    ];

    function getRandomElement<T>(array: T[]): T {
      return array[Math.floor(Math.random() * array.length)];
    }

    function randomInt(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let totalNewScanEvents = 0;
    const activeCampaigns = Array.from(this.campaigns.values()).filter(c => c.status === 'active');

    activeCampaigns.forEach(campaign => {
      // Add exactly 20 new scan events per active campaign
      for (let i = 0; i < 20; i++) {
        // Generate scan times within the campaign period (focus on recent times)
        let scanTime;
        const now = Date.now();
        const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
        const timeRange = now - Math.max(threeDaysAgo, campaign.startDate.getTime());
        scanTime = new Date(campaign.startDate.getTime() + Math.random() * timeRange);
        
        const scanEvent: ScanEvent = {
          id: randomUUID(),
          campaignId: campaign.id,
          region: getRandomElement(regions),
          scannedAt: scanTime,
          userAgent: getRandomElement(userAgents),
          ipAddress: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}` // Mock IP
        };
        
        this.scanEvents.set(scanEvent.id, scanEvent);
        totalNewScanEvents++;
      }
      
      // Update campaign scan count by adding 20
      campaign.scanCount += 20;
      console.log(`Campaign '${campaign.name}' now has ${campaign.scanCount} total scan events (added 20 new ones)`);
    });

    const newTotalScanCount = this.scanEvents.size;
    console.log(`✅ Added ${totalNewScanEvents} new scan events while preserving existing ${currentScanCount} events`);
    console.log(`📊 Total scan events now: ${newTotalScanCount} (was: ${currentScanCount}, added: ${totalNewScanEvents})`);
    
    return {
      added: totalNewScanEvents,
      total: newTotalScanCount
    };
  }

  async getAdminNotifications(): Promise<{
    expiring: { id: string; name: string; category: string; endDate: string; daysLeft: number; createdByUsername: string }[];
    scanLimitReached: { id: string; name: string; category: string; scanCount: number; scanLimit: number; createdByUsername: string }[];
  }> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const expiring: { id: string; name: string; category: string; endDate: string; daysLeft: number; createdByUsername: string }[] = [];
    const scanLimitReached: { id: string; name: string; category: string; scanCount: number; scanLimit: number; createdByUsername: string }[] = [];

    // Check all active campaigns
    for (const campaign of Array.from(this.campaigns.values())) {
      if (campaign.status !== 'active') continue;

      const user = this.users.get(campaign.createdBy);
      const createdByUsername = user?.username || 'Unknown User';

      // Check if campaign is expiring today or tomorrow
      const endDate = new Date(campaign.endDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day for accurate comparison
      
      if (endDate >= now && endDate <= dayAfterTomorrow) {
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        expiring.push({
          id: campaign.id,
          name: campaign.name,
          category: campaign.category,
          endDate: campaign.endDate.toISOString(),
          daysLeft: Math.max(0, daysLeft),
          createdByUsername
        });
      }

      // Check if campaign has reached scan limit
      if (campaign.scanLimit && campaign.scanCount >= campaign.scanLimit) {
        scanLimitReached.push({
          id: campaign.id,
          name: campaign.name,
          category: campaign.category,
          scanCount: campaign.scanCount,
          scanLimit: campaign.scanLimit,
          createdByUsername
        });
      }
    }

    // Sort expiring campaigns by days left (most urgent first)
    expiring.sort((a, b) => a.daysLeft - b.daysLeft);

    // Sort scan limit reached by percentage over limit (most over limit first)
    scanLimitReached.sort((a, b) => (b.scanCount / b.scanLimit) - (a.scanCount / a.scanLimit));

    return {
      expiring,
      scanLimitReached
    };
  }

  // New notification system methods implementation
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return userNotifications;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const unreadCount = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead).length;
    
    return unreadCount;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      id: randomUUID(),
      ...notification,
      isRead: notification.isRead || false,
      createdAt: new Date(),
    };

    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    
    if (!notification || notification.userId !== userId) {
      return false;
    }

    const updatedNotification = {
      ...notification,
      isRead: true,
    };

    this.notifications.set(notificationId, updatedNotification);
    return true;
  }

  async generateNotificationsForAdmins(): Promise<{ created: number; total: number }> {
    // Get all admin users
    const adminUsers = Array.from(this.users.values()).filter(user => user.isAdmin && user.isActive);
    
    if (adminUsers.length === 0) {
      return { created: 0, total: 0 };
    }

    let createdCount = 0;

    // Get campaigns for notifications
    const notifications = await this.getAdminNotifications();
    
    for (const admin of adminUsers) {
      // Create notifications for expiring campaigns
      for (const expiring of notifications.expiring) {
        // Check if notification already exists
        const existingNotification = Array.from(this.notifications.values())
          .find(n => n.campaignId === expiring.id && n.userId === admin.id && n.type === "expiring_campaign");
        
        if (!existingNotification) {
          await this.createNotification({
            type: "expiring_campaign",
            title: "Campaign Expiring Soon",
            message: `Campaign "${expiring.name}" expires in ${expiring.daysLeft} day(s)`,
            campaignId: expiring.id,
            campaignName: expiring.name,
            userId: admin.id,
            isRead: false,
          });
          createdCount++;
        }
      }

      // Create notifications for scan limit reached
      for (const scanLimit of notifications.scanLimitReached) {
        // Check if notification already exists
        const existingNotification = Array.from(this.notifications.values())
          .find(n => n.campaignId === scanLimit.id && n.userId === admin.id && n.type === "scan_limit_reached");
        
        if (!existingNotification) {
          await this.createNotification({
            type: "scan_limit_reached",
            title: "Scan Limit Reached",
            message: `Campaign "${scanLimit.name}" has reached ${scanLimit.scanCount}/${scanLimit.scanLimit} scans`,
            campaignId: scanLimit.id,
            campaignName: scanLimit.name,
            userId: admin.id,
            isRead: false,
          });
          createdCount++;
        }
      }
    }

    return { created: createdCount, total: this.notifications.size };
  }

}

// Database storage implementation using Drizzle ORM

class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const neonClient = neon(connectionString);
    this.db = drizzle(neonClient);
  }

  // User operations
  async getUser(id: string): Promise<SafeUser | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (result.length === 0) return undefined;
    const { password, ...safeUser } = result[0];
    return safeUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const newUser = {
      username: insertUser.username,
      password: hashedPassword,
      isActive: insertUser.isActive ?? true,
      isAdmin: false,
    };
    const result = await this.db.insert(users).values(newUser).returning();
    const { password, ...safeUser } = result[0];
    return safeUser;
  }

  async createUserByAdmin(userData: CreateUserByAdmin): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = {
      username: userData.username,
      password: hashedPassword,
      isActive: userData.isActive ?? true,
      isAdmin: userData.isAdmin || false,
    };
    const result = await this.db.insert(users).values(newUser).returning();
    const { password, ...safeUser } = result[0];
    return safeUser;
  }

  async getUsers(): Promise<SafeUser[]> {
    const result = await this.db.select().from(users);
    return result.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  async updateUserStatus(id: string, status: UpdateUserStatus): Promise<SafeUser | undefined> {
    const result = await this.db.update(users)
      .set({ isActive: status.isActive })
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) return undefined;
    const { password, ...safeUser } = result[0];
    return safeUser;
  }

  async validateUser(username: string, password: string): Promise<SafeUser | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isActive) {
      return null;
    }
    console.log("USER: ",user);
    console.log("Password: ",user);
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return null;
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async changePassword(userId: string, passwordData: { oldPassword: string; newPassword: string }): Promise<void> {
    const user = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      throw new Error("User not found");
    }

    const passwordMatch = await bcrypt.compare(passwordData.oldPassword, user[0].password);
    if (!passwordMatch) {
      throw new Error("Current password is incorrect");
    }

    const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, 10);
    await this.db.update(users)
      .set({ password: hashedNewPassword })
      .where(eq(users.id, userId));
  }

  // Campaign operations
  async getLiveCampaigns(page = 1, limit = 10, sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', filterCategory?: string, filterUser?: string): Promise<{ campaigns: Campaign[], pagination: { page: number, limit: number, total: number, totalPages: number } }> {
    let query = this.db.select({
      id: campaigns.id,
      name: campaigns.name,
      category: campaigns.category,
      description: campaigns.description,
      scanCount: campaigns.scanCount,
      scanLimit: campaigns.scanLimit,
      status: campaigns.status,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      createdBy: campaigns.createdBy,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
      imageUrl: campaigns.imageUrl,
      iconPath: campaigns.iconPath,
      borderStyle: campaigns.borderStyle,
      targetUrl: campaigns.targetUrl,
      createdByUsername: users.username,
    }).from(campaigns).leftJoin(users, eq(campaigns.createdBy, users.id));

    // Apply filters
    const conditions = [];
    if (filterCategory) {
      conditions.push(eq(campaigns.category, filterCategory));
    }
    if (filterUser) {
      conditions.push(eq(campaigns.createdBy, filterUser));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = sortBy === 'name' ? campaigns.name :
                      sortBy === 'category' ? campaigns.category :
                      sortBy === 'scanCount' ? campaigns.scanCount :
                      campaigns.createdAt;
    
    query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));

    // Get total count
    const totalQuery = this.db.select({ count: count() }).from(campaigns);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const totalResult = await totalQuery;
    const total = totalResult[0].count;

    // Apply pagination
    const offset = (page - 1) * limit;
    const result = await query.limit(limit).offset(offset);

    return {
      campaigns: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const result = await this.db.select({
      id: campaigns.id,
      name: campaigns.name,
      category: campaigns.category,
      description: campaigns.description,
      scanCount: campaigns.scanCount,
      scanLimit: campaigns.scanLimit,
      status: campaigns.status,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      createdBy: campaigns.createdBy,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
      imageUrl: campaigns.imageUrl,
      iconPath: campaigns.iconPath,
      borderStyle: campaigns.borderStyle,
      targetUrl: campaigns.targetUrl,
      createdByUsername: users.username,
    }).from(campaigns)
    .leftJoin(users, eq(campaigns.createdBy, users.id))
    .where(eq(campaigns.id, id))
    .limit(1);

    return result[0];
  }

  async createCampaign(insertCampaign: InsertCampaign & { createdBy: string }): Promise<Campaign> {
    const result = await this.db.insert(campaigns).values({
      ...insertCampaign,
      scanCount: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Get the campaign with username
    const campaignWithUsername = await this.getCampaign(result[0].id);
    return campaignWithUsername!;
  }

  async updateCampaign(id: string, updateCampaign: UpdateCampaign): Promise<Campaign | undefined> {
    const result = await this.db.update(campaigns)
      .set({
        ...updateCampaign,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    if (result.length === 0) return undefined;

    // Get the updated campaign with username
    return await this.getCampaign(id);
  }

  async updateCampaignScanCount(id: string): Promise<{ success: boolean; reason?: string }> {
    const campaign = await this.getCampaign(id);
    if (!campaign) {
      return { success: false, reason: "Campaign not found" };
    }

    if (campaign.status !== 'active') {
      return { success: false, reason: "Campaign is not active" };
    }

    if (campaign.scanLimit && campaign.scanCount >= campaign.scanLimit) {
      return { success: false, reason: "Scan limit reached" };
    }

    await this.db.update(campaigns)
      .set({ 
        scanCount: sql`${campaigns.scanCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(campaigns.id, id));

    return { success: true };
  }

  async getCampaignCategories(): Promise<string[]> {
    const result = await this.db.selectDistinct({ category: campaigns.category }).from(campaigns);
    return result.map(r => r.category);
  }

  async getCampaignUsers(): Promise<{id: string, username: string}[]> {
    const result = await this.db.selectDistinct({
      id: users.id,
      username: users.username
    }).from(users)
    .innerJoin(campaigns, eq(campaigns.createdBy, users.id));
    return result;
  }

  // Analytics operations
  async recordScanEvent(insertScanEvent: InsertScanEvent): Promise<ScanEvent> {
    const result = await this.db.insert(scanEvents).values({
      ...insertScanEvent,
      scannedAt: new Date(),
    }).returning();
    
    // Increment the campaign scan count
    try {
      const updateResult = await this.updateCampaignScanCount(insertScanEvent.campaignId);
      if (!updateResult.success) {
        console.error("Failed to update campaign scan count:", updateResult.reason);
      } else {
        console.log("Campaign scan count updated successfully for campaign:", insertScanEvent.campaignId);
      }
    } catch (error) {
      console.error("Error updating campaign scan count:", error);
    }
    
    return result[0];
  }

  async getCampaignAnalytics(campaignId: string, date: string): Promise<CampaignAnalytics> {
    // Convert "today" string to actual current date
    let targetDate: Date;
    if (date === "today") {
      targetDate = new Date();
    } else {
      targetDate = new Date(date);
    }
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Region data
    const regionData = await this.db.select({
      region: scanEvents.region,
      count: count()
    }).from(scanEvents)
    .where(and(
      eq(scanEvents.campaignId, campaignId),
      sql`${scanEvents.scannedAt} >= ${startOfDay}`,
      sql`${scanEvents.scannedAt} <= ${endOfDay}`
    ))
    .groupBy(scanEvents.region);

    // Hourly data (convert to IST)
    const hourlyData = await this.db.select({
      hour: sql<number>`EXTRACT(HOUR FROM ${scanEvents.scannedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`.as('hour'),
      count: count()
    }).from(scanEvents)
    .where(and(
      eq(scanEvents.campaignId, campaignId),
      sql`${scanEvents.scannedAt} >= ${startOfDay}`,
      sql`${scanEvents.scannedAt} <= ${endOfDay}`
    ))
    .groupBy(sql`EXTRACT(HOUR FROM ${scanEvents.scannedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`);

    // Total scans for the day
    const totalResult = await this.db.select({
      count: count()
    }).from(scanEvents)
    .where(and(
      eq(scanEvents.campaignId, campaignId),
      sql`${scanEvents.scannedAt} >= ${startOfDay}`,
      sql`${scanEvents.scannedAt} <= ${endOfDay}`
    ));

    return {
      regionData: regionData.map(r => ({ region: r.region, count: r.count })),
      hourlyData: hourlyData.map(h => ({ hour: h.hour, count: h.count })),
      totalScans: totalResult[0].count,
      date
    };
  }

  async getScanRecords(campaignId: string): Promise<ScanEvent[]> {
    return await this.db.select().from(scanEvents)
      .where(eq(scanEvents.campaignId, campaignId))
      .orderBy(desc(scanEvents.scannedAt));
  }

  async getOverallStats(): Promise<{ totalCampaigns: number; totalScans: number; activeCampaigns: number; expiredCampaigns: number }> {
    const campaignStats = await this.db.select({
      total: count(),
      active: sum(sql`CASE WHEN ${campaigns.status} = 'active' THEN 1 ELSE 0 END`),
      expired: sum(sql`CASE WHEN ${campaigns.status} = 'expired' THEN 1 ELSE 0 END`),
    }).from(campaigns);

    const scanStats = await this.db.select({
      totalScans: count()
    }).from(scanEvents);

    return {
      totalCampaigns: campaignStats[0].total,
      totalScans: scanStats[0].totalScans,
      activeCampaigns: Number(campaignStats[0].active) || 0,
      expiredCampaigns: Number(campaignStats[0].expired) || 0,
    };
  }

  async getUserStats(userId: string): Promise<{ totalCampaigns: number; totalScans: number; activeCampaigns: number; expiredCampaigns: number; createdAt: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const campaignStats = await this.db.select({
      total: count(),
      active: sum(sql`CASE WHEN ${campaigns.status} = 'active' THEN 1 ELSE 0 END`),
      expired: sum(sql`CASE WHEN ${campaigns.status} = 'expired' THEN 1 ELSE 0 END`),
    }).from(campaigns).where(eq(campaigns.createdBy, userId));

    const scanStats = await this.db.select({
      totalScans: count()
    }).from(scanEvents)
    .innerJoin(campaigns, eq(scanEvents.campaignId, campaigns.id))
    .where(eq(campaigns.createdBy, userId));

    return {
      totalCampaigns: campaignStats[0].total,
      totalScans: scanStats[0].totalScans,
      activeCampaigns: Number(campaignStats[0].active) || 0,
      expiredCampaigns: Number(campaignStats[0].expired) || 0,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async getAnalyticsOverall(): Promise<{ totalCampaigns: number; totalScans: number; totalUsers: number; activeCampaigns: number; avgScansPerCampaign: number }> {
    const campaignStats = await this.db.select({
      total: count(),
      active: sum(sql`CASE WHEN ${campaigns.status} = 'active' THEN 1 ELSE 0 END`),
    }).from(campaigns);

    const scanStats = await this.db.select({
      totalScans: count()
    }).from(scanEvents);

    const userStats = await this.db.select({
      totalUsers: count()
    }).from(users);

    const totalCampaigns = campaignStats[0].total;
    const totalScans = scanStats[0].totalScans;
    const avgScansPerCampaign = totalCampaigns > 0 ? Math.round(totalScans / totalCampaigns) : 0;

    return {
      totalCampaigns,
      totalScans,
      totalUsers: userStats[0].totalUsers,
      activeCampaigns: Number(campaignStats[0].active) || 0,
      avgScansPerCampaign,
    };
  }

  async getTopCampaigns(): Promise<{ id: string; name: string; scanCount: number; category: string; createdAt: string }[]> {
    const result = await this.db.select({
      id: campaigns.id,
      name: campaigns.name,
      scanCount: campaigns.scanCount,
      category: campaigns.category,
      createdAt: campaigns.createdAt,
    }).from(campaigns)
    .orderBy(desc(campaigns.scanCount))
    .limit(5);

    return result.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getRegionStats(): Promise<{ region: string; scanCount: number; percentage: number }[]> {
    const regionData = await this.db.select({
      region: scanEvents.region,
      scanCount: count()
    }).from(scanEvents)
    .groupBy(scanEvents.region)
    .orderBy(desc(count()));

    const totalScans = regionData.reduce((sum, r) => sum + r.scanCount, 0);

    return regionData.map(r => ({
      region: r.region,
      scanCount: r.scanCount,
      percentage: totalScans > 0 ? Math.round((r.scanCount / totalScans) * 100) : 0,
    }));
  }

  async getUserGrowthStats(): Promise<{ month: string; userCount: number; campaignCount: number }[]> {
    // This is a simplified implementation - in a real app you'd have more sophisticated month-over-month tracking
    const userGrowth = await this.db.select({
      month: sql<string>`TO_CHAR(${users.createdAt}, 'YYYY-MM')`.as('month'),
      userCount: count()
    }).from(users)
    .groupBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM')`);

    const campaignGrowth = await this.db.select({
      month: sql<string>`TO_CHAR(${campaigns.createdAt}, 'YYYY-MM')`.as('month'),
      campaignCount: count()
    }).from(campaigns)
    .groupBy(sql`TO_CHAR(${campaigns.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${campaigns.createdAt}, 'YYYY-MM')`);

    // Combine the results
    const monthlyData = new Map<string, { userCount: number; campaignCount: number }>();
    
    userGrowth.forEach(ug => {
      monthlyData.set(ug.month, { userCount: ug.userCount, campaignCount: 0 });
    });

    campaignGrowth.forEach(cg => {
      const existing = monthlyData.get(cg.month) || { userCount: 0, campaignCount: 0 };
      monthlyData.set(cg.month, { ...existing, campaignCount: cg.campaignCount });
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      ...data
    }));
  }

  async addNewScanEvents(): Promise<{ added: number; total: number }> {
    // This method doesn't apply to database storage as scan events are added through normal operations
    return { added: 0, total: await this.db.select({ count: count() }).from(scanEvents).then(r => r[0].count) };
  }

  async getAdminNotifications(): Promise<{
    expiring: { id: string; name: string; category: string; endDate: string; daysLeft: number; createdByUsername: string }[];
    scanLimitReached: { id: string; name: string; category: string; scanCount: number; scanLimit: number; createdByUsername: string }[];
  }> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get expiring campaigns
    const expiringCampaigns = await this.db.select({
      id: campaigns.id,
      name: campaigns.name,
      category: campaigns.category,
      endDate: campaigns.endDate,
      createdByUsername: users.username,
    }).from(campaigns)
    .leftJoin(users, eq(campaigns.createdBy, users.id))
    .where(and(
      eq(campaigns.status, 'active'),
      sql`${campaigns.endDate} > ${now}`,
      sql`${campaigns.endDate} <= ${threeDaysFromNow}`
    ));

    // Get campaigns at scan limit
    const scanLimitCampaigns = await this.db.select({
      id: campaigns.id,
      name: campaigns.name,
      category: campaigns.category,
      scanCount: campaigns.scanCount,
      scanLimit: campaigns.scanLimit,
      createdByUsername: users.username,
    }).from(campaigns)
    .leftJoin(users, eq(campaigns.createdBy, users.id))
    .where(and(
      eq(campaigns.status, 'active'),
      sql`${campaigns.scanLimit} IS NOT NULL`,
      sql`${campaigns.scanCount} >= ${campaigns.scanLimit}`
    ));

    return {
      expiring: expiringCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        endDate: c.endDate.toISOString(),
        daysLeft: Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        createdByUsername: c.createdByUsername || 'Unknown'
      })),
      scanLimitReached: scanLimitCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        scanCount: c.scanCount,
        scanLimit: c.scanLimit!,
        createdByUsername: c.createdByUsername || 'Unknown'
      }))
    };
  }

  // Notification methods
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await this.db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.db.select({ count: count() }).from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0].count;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await this.db.insert(notifications).values({
      ...notification,
      isRead: notification.isRead || false,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ))
      .returning();
    
    return result.length > 0;
  }

  async generateNotificationsForAdmins(): Promise<{ created: number; total: number }> {
    // Get all admin users
    const adminUsers = await this.db.select().from(users)
      .where(and(eq(users.isAdmin, true), eq(users.isActive, true)));
    
    if (adminUsers.length === 0) {
      return { created: 0, total: 0 };
    }

    let createdCount = 0;

    // Get campaigns for notifications
    const notificationData = await this.getAdminNotifications();
    
    for (const admin of adminUsers) {
      // Create notifications for expiring campaigns
      for (const expiring of notificationData.expiring) {
        // Check if notification already exists
        const existingNotification = await this.db.select().from(notifications)
          .where(and(
            eq(notifications.campaignId, expiring.id),
            eq(notifications.userId, admin.id),
            eq(notifications.type, "expiring_campaign")
          ))
          .limit(1);
        
        if (existingNotification.length === 0) {
          await this.createNotification({
            type: "expiring_campaign",
            title: "Campaign Expiring Soon",
            message: `Campaign "${expiring.name}" expires in ${expiring.daysLeft} day(s)`,
            campaignId: expiring.id,
            campaignName: expiring.name,
            userId: admin.id,
            isRead: false,
          });
          createdCount++;
        }
      }

      // Create notifications for scan limit reached
      for (const scanLimit of notificationData.scanLimitReached) {
        // Check if notification already exists
        const existingNotification = await this.db.select().from(notifications)
          .where(and(
            eq(notifications.campaignId, scanLimit.id),
            eq(notifications.userId, admin.id),
            eq(notifications.type, "scan_limit_reached")
          ))
          .limit(1);
        
        if (existingNotification.length === 0) {
          await this.createNotification({
            type: "scan_limit_reached",
            title: "Scan Limit Reached",
            message: `Campaign "${scanLimit.name}" has reached ${scanLimit.scanCount}/${scanLimit.scanLimit} scans`,
            campaignId: scanLimit.id,
            campaignName: scanLimit.name,
            userId: admin.id,
            isRead: false,
          });
          createdCount++;
        }
      }
    }

    // Get total notifications
    const totalResult = await this.db.select({ count: count() }).from(notifications);
    return { created: createdCount, total: totalResult[0].count };
  }
}

// Switch to database storage
export const storage = new DatabaseStorage();
