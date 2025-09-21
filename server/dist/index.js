var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, insertUserSchema, updateUserStatusSchema, changePasswordSchema, changePasswordApiSchema, createUserByAdminSchema, campaigns, scanEvents, insertCampaignSchema, updateCampaignSchema, insertScanEventSchema, notifications, insertNotificationSchema, loginSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      username: text("username").notNull().unique(),
      password: text("password").notNull(),
      isActive: boolean("is_active").default(true).notNull(),
      isAdmin: boolean("is_admin").default(false).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      password: true,
      isActive: true
    });
    updateUserStatusSchema = z.object({
      isActive: z.boolean()
    });
    changePasswordSchema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(6, "New password must be at least 6 characters"),
      confirmPassword: z.string().min(1, "Please confirm your new password")
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    }).refine((data) => data.newPassword !== data.currentPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"]
    });
    changePasswordApiSchema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(6, "New password must be at least 6 characters")
    }).refine((data) => data.newPassword !== data.currentPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"]
    });
    createUserByAdminSchema = insertUserSchema.extend({
      isAdmin: z.boolean().optional().default(false),
      isActive: z.boolean().optional().default(true)
    });
    campaigns = pgTable("campaigns", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      category: text("category").notNull(),
      description: text("description"),
      // Campaign description
      scanCount: integer("scan_count").default(0).notNull(),
      scanLimit: integer("scan_limit"),
      // Optional scan limit for rate limiting
      status: text("status", { enum: ["active", "expired"] }).default("active").notNull(),
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date").notNull(),
      createdBy: varchar("created_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at").default(sql`now()`).notNull(),
      updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
      imageUrl: text("image_url"),
      // Optional campaign image
      iconPath: text("icon_path"),
      // Optional QR code icon file path
      borderStyle: text("border_style", { enum: ["thick", "none"] }).default("none").notNull(),
      // QR code border style
      targetUrl: text("target_url")
      // Custom URL for QR code destination
    });
    scanEvents = pgTable("scan_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
      region: text("region").notNull(),
      // Region where scan occurred
      scannedAt: timestamp("scanned_at").default(sql`now()`).notNull(),
      userAgent: text("user_agent"),
      // Optional user agent for additional analytics
      ipAddress: text("ip_address")
      // Optional IP for region detection
    });
    insertCampaignSchema = createInsertSchema(campaigns).omit({
      id: true,
      scanCount: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      startDate: z.string().or(z.date()).transform((val) => new Date(val)),
      endDate: z.string().or(z.date()).transform((val) => new Date(val)),
      scanLimit: z.number().int().positive().optional(),
      borderStyle: z.enum(["thick", "none"]).default("none"),
      targetUrl: z.string().url("Please enter a valid URL").optional().nullable()
    });
    updateCampaignSchema = createInsertSchema(campaigns).omit({
      id: true,
      scanCount: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      status: true
      // Status is managed automatically
    }).extend({
      startDate: z.string().or(z.date()).transform((val) => new Date(val)),
      endDate: z.string().or(z.date()).transform((val) => new Date(val)),
      scanLimit: z.number().int().positive().optional().nullable(),
      borderStyle: z.enum(["thick", "none"]).default("none"),
      targetUrl: z.string().url("Please enter a valid URL").optional().nullable()
    });
    insertScanEventSchema = createInsertSchema(scanEvents).omit({
      id: true,
      scannedAt: true
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      type: text("type", { enum: ["expiring_campaign", "scan_limit_reached"] }).notNull(),
      title: text("title").notNull(),
      message: text("message").notNull(),
      campaignId: varchar("campaign_id").references(() => campaigns.id),
      campaignName: text("campaign_name"),
      userId: varchar("user_id").notNull().references(() => users.id),
      // Admin user who should see this
      isRead: boolean("is_read").default(false).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
    loginSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    });
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storage: () => storage
});
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, asc, sql as sql2, and, count, sum } from "drizzle-orm";
import "dotenv/config";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    DatabaseStorage = class {
      db;
      constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error("DATABASE_URL is not set");
        }
        const neonClient = neon(connectionString);
        this.db = drizzle(neonClient);
      }
      // User operations
      async getUser(id) {
        const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
        if (result.length === 0) return void 0;
        const { password, ...safeUser } = result[0];
        return safeUser;
      }
      async getUserByUsername(username) {
        const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
        return result[0];
      }
      async createUser(insertUser) {
        const hashedPassword = await bcrypt.hash(insertUser.password, 10);
        const newUser = {
          username: insertUser.username,
          password: hashedPassword,
          isActive: insertUser.isActive ?? true,
          isAdmin: false
        };
        const result = await this.db.insert(users).values(newUser).returning();
        const { password, ...safeUser } = result[0];
        return safeUser;
      }
      async createUserByAdmin(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = {
          username: userData.username,
          password: hashedPassword,
          isActive: userData.isActive ?? true,
          isAdmin: userData.isAdmin || false
        };
        const result = await this.db.insert(users).values(newUser).returning();
        const { password, ...safeUser } = result[0];
        return safeUser;
      }
      async getUsers() {
        const result = await this.db.select().from(users);
        return result.map((user) => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
      }
      async updateUserStatus(id, status) {
        const result = await this.db.update(users).set({ isActive: status.isActive }).where(eq(users.id, id)).returning();
        if (result.length === 0) return void 0;
        const { password, ...safeUser } = result[0];
        return safeUser;
      }
      async validateUser(username, password) {
        const user = await this.getUserByUsername(username);
        if (!user || !user.isActive) {
          return null;
        }
        console.log("USER: ", user);
        console.log("Password: ", user);
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return null;
        }
        const { password: _, ...safeUser } = user;
        return safeUser;
      }
      async changePassword(userId, passwordData) {
        const user = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length === 0) {
          throw new Error("User not found");
        }
        const passwordMatch = await bcrypt.compare(passwordData.oldPassword, user[0].password);
        if (!passwordMatch) {
          throw new Error("Current password is incorrect");
        }
        const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, 10);
        await this.db.update(users).set({ password: hashedNewPassword }).where(eq(users.id, userId));
      }
      // Campaign operations
      async getLiveCampaigns(page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", filterCategory, filterUser) {
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
          createdByUsername: users.username
        }).from(campaigns).leftJoin(users, eq(campaigns.createdBy, users.id));
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
        const sortColumn = sortBy === "name" ? campaigns.name : sortBy === "category" ? campaigns.category : sortBy === "scanCount" ? campaigns.scanCount : campaigns.createdAt;
        query = query.orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn));
        const totalQuery = this.db.select({ count: count() }).from(campaigns);
        if (conditions.length > 0) {
          totalQuery.where(and(...conditions));
        }
        const totalResult = await totalQuery;
        const total = totalResult[0].count;
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
      async getCampaign(id) {
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
          createdByUsername: users.username
        }).from(campaigns).leftJoin(users, eq(campaigns.createdBy, users.id)).where(eq(campaigns.id, id)).limit(1);
        return result[0];
      }
      async createCampaign(insertCampaign) {
        const result = await this.db.insert(campaigns).values({
          ...insertCampaign,
          scanCount: 0,
          status: "active",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        const campaignWithUsername = await this.getCampaign(result[0].id);
        return campaignWithUsername;
      }
      async updateCampaign(id, updateCampaign) {
        const result = await this.db.update(campaigns).set({
          ...updateCampaign,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(campaigns.id, id)).returning();
        if (result.length === 0) return void 0;
        return await this.getCampaign(id);
      }
      async updateCampaignScanCount(id) {
        const campaign = await this.getCampaign(id);
        if (!campaign) {
          return { success: false, reason: "Campaign not found" };
        }
        if (campaign.status !== "active") {
          return { success: false, reason: "Campaign is not active" };
        }
        if (campaign.scanLimit && campaign.scanCount >= campaign.scanLimit) {
          return { success: false, reason: "Scan limit reached" };
        }
        await this.db.update(campaigns).set({
          scanCount: sql2`${campaigns.scanCount} + 1`,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(campaigns.id, id));
        return { success: true };
      }
      async getCampaignCategories() {
        const result = await this.db.selectDistinct({ category: campaigns.category }).from(campaigns);
        return result.map((r) => r.category);
      }
      async getCampaignUsers() {
        const result = await this.db.selectDistinct({
          id: users.id,
          username: users.username
        }).from(users).innerJoin(campaigns, eq(campaigns.createdBy, users.id));
        return result;
      }
      // Analytics operations
      async recordScanEvent(insertScanEvent) {
        const result = await this.db.insert(scanEvents).values({
          ...insertScanEvent,
          scannedAt: /* @__PURE__ */ new Date()
        }).returning();
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
      async getCampaignAnalytics(campaignId, date) {
        let targetDate;
        if (date === "today") {
          targetDate = /* @__PURE__ */ new Date();
        } else {
          targetDate = new Date(date);
        }
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const regionData = await this.db.select({
          region: scanEvents.region,
          count: count()
        }).from(scanEvents).where(and(
          eq(scanEvents.campaignId, campaignId),
          sql2`${scanEvents.scannedAt} >= ${startOfDay}`,
          sql2`${scanEvents.scannedAt} <= ${endOfDay}`
        )).groupBy(scanEvents.region);
        const hourlyData = await this.db.select({
          hour: sql2`EXTRACT(HOUR FROM ${scanEvents.scannedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`.as("hour"),
          count: count()
        }).from(scanEvents).where(and(
          eq(scanEvents.campaignId, campaignId),
          sql2`${scanEvents.scannedAt} >= ${startOfDay}`,
          sql2`${scanEvents.scannedAt} <= ${endOfDay}`
        )).groupBy(sql2`EXTRACT(HOUR FROM ${scanEvents.scannedAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`);
        const totalResult = await this.db.select({
          count: count()
        }).from(scanEvents).where(and(
          eq(scanEvents.campaignId, campaignId),
          sql2`${scanEvents.scannedAt} >= ${startOfDay}`,
          sql2`${scanEvents.scannedAt} <= ${endOfDay}`
        ));
        return {
          regionData: regionData.map((r) => ({ region: r.region, count: r.count })),
          hourlyData: hourlyData.map((h) => ({ hour: h.hour, count: h.count })),
          totalScans: totalResult[0].count,
          date
        };
      }
      async getScanRecords(campaignId) {
        return await this.db.select().from(scanEvents).where(eq(scanEvents.campaignId, campaignId)).orderBy(desc(scanEvents.scannedAt));
      }
      async getOverallStats() {
        const campaignStats = await this.db.select({
          total: count(),
          active: sum(sql2`CASE WHEN ${campaigns.status} = 'active' THEN 1 ELSE 0 END`),
          expired: sum(sql2`CASE WHEN ${campaigns.status} = 'expired' THEN 1 ELSE 0 END`)
        }).from(campaigns);
        const scanStats = await this.db.select({
          totalScans: count()
        }).from(scanEvents);
        return {
          totalCampaigns: campaignStats[0].total,
          totalScans: scanStats[0].totalScans,
          activeCampaigns: Number(campaignStats[0].active) || 0,
          expiredCampaigns: Number(campaignStats[0].expired) || 0
        };
      }
      async getUserStats(userId) {
        const user = await this.getUser(userId);
        if (!user) throw new Error("User not found");
        const campaignStats = await this.db.select({
          total: count(),
          active: sum(sql2`CASE WHEN ${campaigns.status} = 'active' THEN 1 ELSE 0 END`),
          expired: sum(sql2`CASE WHEN ${campaigns.status} = 'expired' THEN 1 ELSE 0 END`)
        }).from(campaigns).where(eq(campaigns.createdBy, userId));
        const scanStats = await this.db.select({
          totalScans: count()
        }).from(scanEvents).innerJoin(campaigns, eq(scanEvents.campaignId, campaigns.id)).where(eq(campaigns.createdBy, userId));
        return {
          totalCampaigns: campaignStats[0].total,
          totalScans: scanStats[0].totalScans,
          activeCampaigns: Number(campaignStats[0].active) || 0,
          expiredCampaigns: Number(campaignStats[0].expired) || 0,
          createdAt: user.createdAt.toISOString()
        };
      }
      async getAnalyticsOverall() {
        const campaignStats = await this.db.select({
          total: count(),
          active: sum(sql2`CASE WHEN ${campaigns.status} = 'active' THEN 1 ELSE 0 END`)
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
          avgScansPerCampaign
        };
      }
      async getTopCampaigns() {
        const result = await this.db.select({
          id: campaigns.id,
          name: campaigns.name,
          scanCount: campaigns.scanCount,
          category: campaigns.category,
          createdAt: campaigns.createdAt
        }).from(campaigns).orderBy(desc(campaigns.scanCount)).limit(5);
        return result.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString()
        }));
      }
      async getRegionStats() {
        const regionData = await this.db.select({
          region: scanEvents.region,
          scanCount: count()
        }).from(scanEvents).groupBy(scanEvents.region).orderBy(desc(count()));
        const totalScans = regionData.reduce((sum2, r) => sum2 + r.scanCount, 0);
        return regionData.map((r) => ({
          region: r.region,
          scanCount: r.scanCount,
          percentage: totalScans > 0 ? Math.round(r.scanCount / totalScans * 100) : 0
        }));
      }
      async getUserGrowthStats() {
        const userGrowth = await this.db.select({
          month: sql2`TO_CHAR(${users.createdAt}, 'YYYY-MM')`.as("month"),
          userCount: count()
        }).from(users).groupBy(sql2`TO_CHAR(${users.createdAt}, 'YYYY-MM')`).orderBy(sql2`TO_CHAR(${users.createdAt}, 'YYYY-MM')`);
        const campaignGrowth = await this.db.select({
          month: sql2`TO_CHAR(${campaigns.createdAt}, 'YYYY-MM')`.as("month"),
          campaignCount: count()
        }).from(campaigns).groupBy(sql2`TO_CHAR(${campaigns.createdAt}, 'YYYY-MM')`).orderBy(sql2`TO_CHAR(${campaigns.createdAt}, 'YYYY-MM')`);
        const monthlyData = /* @__PURE__ */ new Map();
        userGrowth.forEach((ug) => {
          monthlyData.set(ug.month, { userCount: ug.userCount, campaignCount: 0 });
        });
        campaignGrowth.forEach((cg) => {
          const existing = monthlyData.get(cg.month) || { userCount: 0, campaignCount: 0 };
          monthlyData.set(cg.month, { ...existing, campaignCount: cg.campaignCount });
        });
        return Array.from(monthlyData.entries()).map(([month, data]) => ({
          month,
          ...data
        }));
      }
      async addNewScanEvents() {
        return { added: 0, total: await this.db.select({ count: count() }).from(scanEvents).then((r) => r[0].count) };
      }
      async getAdminNotifications() {
        const now = /* @__PURE__ */ new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1e3);
        const expiringCampaigns = await this.db.select({
          id: campaigns.id,
          name: campaigns.name,
          category: campaigns.category,
          endDate: campaigns.endDate,
          createdByUsername: users.username
        }).from(campaigns).leftJoin(users, eq(campaigns.createdBy, users.id)).where(and(
          eq(campaigns.status, "active"),
          sql2`${campaigns.endDate} > ${now}`,
          sql2`${campaigns.endDate} <= ${threeDaysFromNow}`
        ));
        const scanLimitCampaigns = await this.db.select({
          id: campaigns.id,
          name: campaigns.name,
          category: campaigns.category,
          scanCount: campaigns.scanCount,
          scanLimit: campaigns.scanLimit,
          createdByUsername: users.username
        }).from(campaigns).leftJoin(users, eq(campaigns.createdBy, users.id)).where(and(
          eq(campaigns.status, "active"),
          sql2`${campaigns.scanLimit} IS NOT NULL`,
          sql2`${campaigns.scanCount} >= ${campaigns.scanLimit}`
        ));
        return {
          expiring: expiringCampaigns.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            endDate: c.endDate.toISOString(),
            daysLeft: Math.ceil((c.endDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)),
            createdByUsername: c.createdByUsername || "Unknown"
          })),
          scanLimitReached: scanLimitCampaigns.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            scanCount: c.scanCount,
            scanLimit: c.scanLimit,
            createdByUsername: c.createdByUsername || "Unknown"
          }))
        };
      }
      // Notification methods
      async getUserNotifications(userId) {
        return await this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
      }
      async getUnreadNotificationCount(userId) {
        const result = await this.db.select({ count: count() }).from(notifications).where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
        return result[0].count;
      }
      async createNotification(notification) {
        const result = await this.db.insert(notifications).values({
          ...notification,
          isRead: notification.isRead || false,
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        return result[0];
      }
      async markNotificationAsRead(notificationId, userId) {
        const result = await this.db.update(notifications).set({ isRead: true }).where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )).returning();
        return result.length > 0;
      }
      async generateNotificationsForAdmins() {
        const adminUsers = await this.db.select().from(users).where(and(eq(users.isAdmin, true), eq(users.isActive, true)));
        if (adminUsers.length === 0) {
          return { created: 0, total: 0 };
        }
        let createdCount = 0;
        const notificationData = await this.getAdminNotifications();
        for (const admin of adminUsers) {
          for (const expiring of notificationData.expiring) {
            const existingNotification = await this.db.select().from(notifications).where(and(
              eq(notifications.campaignId, expiring.id),
              eq(notifications.userId, admin.id),
              eq(notifications.type, "expiring_campaign")
            )).limit(1);
            if (existingNotification.length === 0) {
              await this.createNotification({
                type: "expiring_campaign",
                title: "Campaign Expiring Soon",
                message: `Campaign "${expiring.name}" expires in ${expiring.daysLeft} day(s)`,
                campaignId: expiring.id,
                campaignName: expiring.name,
                userId: admin.id,
                isRead: false
              });
              createdCount++;
            }
          }
          for (const scanLimit of notificationData.scanLimitReached) {
            const existingNotification = await this.db.select().from(notifications).where(and(
              eq(notifications.campaignId, scanLimit.id),
              eq(notifications.userId, admin.id),
              eq(notifications.type, "scan_limit_reached")
            )).limit(1);
            if (existingNotification.length === 0) {
              await this.createNotification({
                type: "scan_limit_reached",
                title: "Scan Limit Reached",
                message: `Campaign "${scanLimit.name}" has reached ${scanLimit.scanCount}/${scanLimit.scanLimit} scans`,
                campaignId: scanLimit.id,
                campaignName: scanLimit.name,
                userId: admin.id,
                isRead: false
              });
              createdCount++;
            }
          }
        }
        const totalResult = await this.db.select({ count: count() }).from(notifications);
        return { created: createdCount, total: totalResult[0].count };
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
init_storage();
init_schema();
import express from "express";
import { createServer } from "http";
import session from "express-session";
import { z as z2 } from "zod";

// server/logger.ts
var Logger = class {
  logs = [];
  formatMessage(entry) {
    const { timestamp: timestamp2, level, message, path: path4, method, statusCode, userId } = entry;
    let logMessage = `[${timestamp2}] ${level}: ${message}`;
    if (path4 && method) {
      logMessage += ` | ${method} ${path4}`;
    }
    if (statusCode) {
      logMessage += ` | Status: ${statusCode}`;
    }
    if (userId) {
      logMessage += ` | User: ${userId}`;
    }
    return logMessage;
  }
  createEntry(level, message, context) {
    return {
      level,
      message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...context
    };
  }
  info(message, context) {
    const entry = this.createEntry("INFO", message, context);
    this.logs.push(entry);
    console.log(this.formatMessage(entry));
  }
  warn(message, context) {
    const entry = this.createEntry("WARN", message, context);
    this.logs.push(entry);
    console.warn(this.formatMessage(entry));
  }
  error(message, context) {
    const entry = this.createEntry("ERROR", message, context);
    this.logs.push(entry);
    console.error(this.formatMessage(entry));
    if (entry.error) {
      console.error("Error details:", entry.error);
    }
  }
  debug(message, context) {
    if (process.env.NODE_ENV === "development") {
      const entry = this.createEntry("DEBUG", message, context);
      this.logs.push(entry);
      console.debug(this.formatMessage(entry));
    }
  }
  // API endpoint to get recent logs (for debugging)
  getRecentLogs(limit = 100) {
    return this.logs.slice(-limit);
  }
  // Clear old logs to prevent memory leaks
  clearOldLogs(keepCount = 1e3) {
    if (this.logs.length > keepCount) {
      this.logs = this.logs.slice(-keepCount);
    }
  }
};
var logger = new Logger();
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, path: path4 } = req;
  const userId = req.session?.user?.id;
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 400 ? "ERROR" : statusCode >= 300 ? "WARN" : "INFO";
    logger[level.toLowerCase()](
      `Request completed in ${duration}ms`,
      { method, path: path4, statusCode, userId }
    );
  });
  next();
}
function errorHandler(err, req, res, next) {
  logger.error("Unhandled error occurred", {
    error: err,
    method: req.method,
    path: req.path,
    userId: req.session?.user?.id
  });
  const isDevelopment = process.env.NODE_ENV === "development";
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  const message = isDevelopment ? err.message : "Internal Server Error";
  res.status(status).json({
    error: message,
    ...isDevelopment && { stack: err.stack }
  });
}

// server/middleware.ts
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn("Request validation failed", {
          method: req.method,
          path: req.path,
          error: result.error.errors,
          userId: req.session?.user?.id
        });
        return res.status(400).json({
          error: "Validation failed",
          details: result.error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
            code: err.code
          }))
        });
      }
      req.validatedBody = result.data;
      next();
    } catch (error) {
      logger.error("Validation middleware error", {
        error,
        method: req.method,
        path: req.path,
        userId: req.session?.user?.id
      });
      res.status(500).json({ error: "Internal validation error" });
    }
  };
}
function requireAuth(req, res, next) {
  const session2 = req.session;
  if (!session2?.user) {
    logger.warn("Unauthenticated access attempt", {
      method: req.method,
      path: req.path
    });
    return res.status(401).json({ error: "Authentication required" });
  }
  logger.debug("Authenticated request", {
    method: req.method,
    path: req.path,
    userId: session2.user.id
  });
  next();
}
async function requireAdmin(req, res, next) {
  const session2 = req.session;
  if (!session2?.user) {
    logger.warn("Unauthenticated admin access attempt", {
      method: req.method,
      path: req.path
    });
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const user = await storage2.getUser(session2.user.id);
    if (!user || !user.isAdmin) {
      logger.warn("Non-admin access attempt", {
        method: req.method,
        path: req.path,
        userId: session2.user.id
      });
      return res.status(403).json({ error: "Admin access required" });
    }
    logger.debug("Admin authenticated request", {
      method: req.method,
      path: req.path,
      userId: session2.user.id
    });
    next();
  } catch (error) {
    logger.error("Admin authorization error", {
      error,
      method: req.method,
      path: req.path,
      userId: session2.user.id
    });
    res.status(500).json({ error: "Authorization check failed" });
  }
}
var rateLimitMap = /* @__PURE__ */ new Map();
function rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1e3) {
  return (req, res, next) => {
    if (req.method === "HEAD") {
      return next();
    }
    const key = req.ip || "unknown";
    const now = Date.now();
    const clientData = rateLimitMap.get(key) || { count: 0, lastReset: now };
    if (now - clientData.lastReset > windowMs) {
      clientData.count = 0;
      clientData.lastReset = now;
    }
    clientData.count++;
    rateLimitMap.set(key, clientData);
    if (clientData.count > maxRequests) {
      logger.warn("Rate limit exceeded", {
        method: req.method,
        path: req.path,
        userId: req.session?.user?.id
      });
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((windowMs - (now - clientData.lastReset)) / 1e3)
      });
    }
    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": (maxRequests - clientData.count).toString(),
      "X-RateLimit-Reset": new Date(clientData.lastReset + windowMs).toISOString()
    });
    next();
  };
}
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

// server/routes.ts
import multer from "multer";
import path from "path";
import fs from "fs/promises";
async function registerRoutes(app2) {
  const uploadsDir = path.join(process.cwd(), "uploads");
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for QR code icons"));
      }
    },
    limits: {
      fileSize: 2 * 1024 * 1024
      // 2MB limit
    }
  });
  app2.use(securityHeaders);
  app2.use("/uploads", express.static(uploadsDir));
  app2.head("/api", (req, res) => {
    res.status(200).end();
  });
  app2.use("/api", rateLimit(100, 15 * 60 * 1e3));
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  app2.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        // Set to false for Replit development/production
        httpOnly: true,
        sameSite: "lax",
        // Changed from 'strict' to 'lax' for better compatibility
        maxAge: 1e3 * 60 * 60 * 24
        // 24 hours
      }
    })
  );
  const loginSchema2 = z2.object({
    username: z2.string().min(1, "Username is required"),
    password: z2.string().min(1, "Password is required")
  });
  app2.post(
    "/api/auth/register",
    validateBody(insertUserSchema),
    async (req, res) => {
      try {
        const validatedData = req.validatedBody;
        const existingUser = await storage.getUserByUsername(
          validatedData.username
        );
        if (existingUser) {
          logger.warn("Registration attempt with existing username", {
            username: validatedData.username,
            method: req.method,
            path: req.path
          });
          return res.status(409).json({ error: "Username already exists" });
        }
        const newUser = await storage.createUser(validatedData);
        req.session.user = {
          id: newUser.id,
          username: newUser.username
        };
        logger.info("User registered successfully", {
          userId: newUser.id,
          username: newUser.username,
          method: req.method,
          path: req.path
        });
        res.status(201).json({
          message: "User created successfully",
          user: { id: newUser.id, username: newUser.username }
        });
      } catch (error) {
        logger.error("Registration failed", {
          error,
          method: req.method,
          path: req.path
        });
        res.status(500).json({ error: "Registration failed" });
      }
    }
  );
  app2.post("/api/auth/login", validateBody(loginSchema2), async (req, res) => {
    try {
      const validatedData = req.validatedBody;
      const user = await storage.validateUser(
        validatedData.username,
        validatedData.password
      );
      if (!user) {
        logger.warn("Failed login attempt", {
          username: validatedData.username,
          method: req.method,
          path: req.path
        });
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.session.user = {
        id: user.id,
        username: user.username
      };
      logger.info("User logged in successfully", {
        userId: user.id,
        username: user.username,
        method: req.method,
        path: req.path
      });
      res.json({
        message: "Login successful",
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      logger.error("Login failed", {
        error,
        method: req.method,
        path: req.path
      });
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout successful" });
    });
  });
  app2.get("/api/auth/me", (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });
  app2.patch(
    "/api/auth/change-password",
    requireAuth,
    validateBody(changePasswordApiSchema),
    async (req, res) => {
      try {
        const { currentPassword, newPassword } = req.validatedBody;
        const session2 = req.session;
        await storage.changePassword(session2.user.id, {
          oldPassword: currentPassword,
          newPassword
        });
        logger.info("Password changed successfully", {
          userId: session2.user.id,
          method: req.method,
          path: req.path
        });
        res.json({ message: "Password changed successfully" });
      } catch (error) {
        logger.warn("Password change failed", {
          error: error.message,
          userId: req.session?.user?.id,
          method: req.method,
          path: req.path
        });
        res.status(400).json({ error: error.message || "Failed to change password" });
      }
    }
  );
  app2.get("/api/users", requireAdmin, async (_req, res) => {
    try {
      const users2 = await storage.getUsers();
      res.json(users2);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const notifications2 = await storage.getAdminNotifications();
      logger.info("Admin notifications fetched", {
        expiringCount: notifications2.expiring.length,
        scanLimitReachedCount: notifications2.scanLimitReached.length,
        userId: req.session.user.id,
        method: req.method,
        path: req.path
      });
      res.json(notifications2);
    } catch (error) {
      logger.error("Failed to fetch admin notifications", {
        error: error.message,
        userId: req.session?.user?.id,
        method: req.method,
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch admin notifications" });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const notifications2 = await storage.getUserNotifications(userId);
      const unreadCount = await storage.getUnreadNotificationCount(userId);
      logger.info("User notifications fetched successfully", {
        method: "GET",
        path: req.path,
        userId,
        username: req.session.user?.username,
        totalNotifications: notifications2.length,
        unreadCount
      });
      res.json({
        notifications: notifications2,
        unreadCount
      });
    } catch (error) {
      logger.error("Error fetching user notifications", {
        error: error.message,
        method: "GET",
        path: req.path,
        userId: req.session.user?.id,
        username: req.session.user?.username
      });
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  app2.post("/api/notifications", requireAuth, validateBody(insertNotificationSchema), async (req, res) => {
    try {
      const userId = req.session.user.id;
      const validatedData = req.validatedBody;
      const notificationData = {
        type: validatedData.type || "expiring_campaign",
        title: validatedData.title,
        message: validatedData.message,
        campaignId: validatedData.campaignId || null,
        campaignName: validatedData.campaignName || validatedData.title,
        userId,
        isRead: validatedData.isRead || false
      };
      const notification = await storage.createNotification(notificationData);
      logger.info("Notification created successfully", {
        method: "POST",
        path: req.path,
        userId,
        username: req.session.user?.username,
        notificationId: notification.id,
        title: notification.title
      });
      res.status(201).json(notification);
    } catch (error) {
      logger.error("Error creating notification", {
        error: error.message,
        method: "POST",
        path: req.path,
        userId: req.session.user?.id,
        username: req.session.user?.username,
        body: req.body
      });
      res.status(500).json({ error: "Failed to create notification" });
    }
  });
  app2.post("/api/notifications/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.session.user.id;
      const success = await storage.markNotificationAsRead(notificationId, userId);
      if (!success) {
        return res.status(404).json({ error: "Notification not found or access denied" });
      }
      logger.info("Notification marked as read", {
        method: "POST",
        path: req.path,
        userId,
        username: req.session.user?.username,
        notificationId
      });
      res.json({ success: true });
    } catch (error) {
      logger.error("Error marking notification as read", {
        error: error.message,
        method: "POST",
        path: req.path,
        userId: req.session.user?.id,
        username: req.session.user?.username,
        notificationId: req.params.id
      });
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  app2.post("/api/admin/generate-notifications", requireAdmin, async (req, res) => {
    try {
      const result = await storage.generateNotificationsForAdmins();
      logger.info("Admin notifications generated successfully", {
        method: "POST",
        path: req.path,
        userId: req.session.user?.id,
        username: req.session.user?.username,
        created: result.created,
        total: result.total
      });
      res.json({
        success: true,
        message: `Generated ${result.created} new notifications`,
        created: result.created,
        total: result.total
      });
    } catch (error) {
      logger.error("Error generating admin notifications", {
        error: error.message,
        method: "POST",
        path: req.path,
        userId: req.session.user?.id,
        username: req.session.user?.username
      });
      res.status(500).json({ error: "Failed to generate notifications" });
    }
  });
  app2.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const result = createUserByAdminSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid user data", details: result.error.issues });
      }
      const existingUser = await storage.getUserByUsername(
        result.data.username
      );
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }
      const newUser = await storage.createUserByAdmin(result.data);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.get("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app2.patch("/api/users/:id/status", requireAdmin, async (req, res) => {
    try {
      const result = updateUserStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid status data", details: result.error.issues });
      }
      const session2 = req.session;
      const currentUserId = session2.user.id;
      const targetUserId = req.params.id;
      if (result.data.isActive === false) {
        const allUsers = await storage.getUsers();
        const activeUsers = allUsers.filter((user) => user.isActive);
        if (activeUsers.length === 1 && activeUsers[0].id === targetUserId) {
          return res.status(400).json({
            error: "Cannot deactivate the last active user",
            message: "There must be at least one active user in the system."
          });
        }
      }
      const updatedUser = await storage.updateUserStatus(
        req.params.id,
        result.data
      );
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      if (targetUserId === currentUserId && result.data.isActive === false) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
        });
        return res.json({
          ...updatedUser,
          selfDeactivated: true,
          message: "Account deactivated successfully. You will be logged out."
        });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });
  app2.post("/api/admin/backfill-locations", requireAdmin, async (req, res) => {
    try {
      await storage.backfillIPToLocation();
      res.json({ success: true, message: "IP addresses successfully converted to location names" });
    } catch (error) {
      console.error("Backfill error:", error);
      res.status(500).json({ error: "Failed to backfill locations" });
    }
  });
  app2.get("/api/campaigns/live", requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const sortBy = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
      const filterCategory = req.query.filterCategory;
      const filterUser = req.query.filterUser;
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "Invalid pagination parameters" });
      }
      const validSortFields = ["createdAt", "endDate", "scanCount", "name"];
      if (!validSortFields.includes(sortBy)) {
        return res.status(400).json({ error: "Invalid sort field" });
      }
      const result = await storage.getLiveCampaigns(page, limit, sortBy, sortOrder, filterCategory, filterUser);
      res.json(result);
    } catch (error) {
      logger.error("Error fetching live campaigns", {
        error,
        method: "GET",
        path: "/api/campaigns/live"
      });
      res.status(500).json({ error: "Failed to fetch live campaigns" });
    }
  });
  app2.get("/api/campaigns/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCampaignCategories();
      res.json(categories);
    } catch (error) {
      logger.error("Error fetching campaign categories", {
        error,
        method: "GET",
        path: "/api/campaigns/categories"
      });
      res.status(500).json({ error: "Failed to fetch campaign categories" });
    }
  });
  app2.get("/api/campaigns/users", requireAuth, async (req, res) => {
    try {
      const users2 = await storage.getCampaignUsers();
      res.json(users2);
    } catch (error) {
      logger.error("Error fetching campaign users", {
        error,
        method: "GET",
        path: "/api/campaigns/users"
      });
      res.status(500).json({ error: "Failed to fetch campaign users" });
    }
  });
  app2.get("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      logger.error("Error fetching campaign", {
        error,
        campaignId: req.params.id,
        method: "GET",
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });
  app2.post(
    "/api/upload/icon",
    requireAuth,
    upload.single("icon"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        const iconPath = `/uploads/${req.file.filename}`;
        logger.info("Icon uploaded successfully", {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          userId: req.session.user.id,
          method: "POST",
          path: "/api/upload/icon"
        });
        res.json({ iconPath });
      } catch (error) {
        logger.error("Error uploading icon", {
          error,
          userId: req.session.user?.id,
          method: "POST",
          path: "/api/upload/icon"
        });
        res.status(500).json({ error: "Failed to upload icon" });
      }
    }
  );
  app2.post(
    "/api/campaigns",
    requireAuth,
    validateBody(insertCampaignSchema),
    async (req, res) => {
      try {
        const validatedData = req.validatedBody;
        const campaignData = {
          ...validatedData,
          createdBy: req.session.user.id
        };
        const newCampaign = await storage.createCampaign(campaignData);
        logger.info("Campaign created successfully", {
          campaignId: newCampaign.id,
          campaignName: newCampaign.name,
          createdBy: req.session.user.id,
          method: "POST",
          path: "/api/campaigns"
        });
        res.status(201).json(newCampaign);
      } catch (error) {
        logger.error("Error creating campaign", {
          error,
          userId: req.session.user?.id,
          method: "POST",
          path: "/api/campaigns"
        });
        res.status(500).json({ error: "Failed to create campaign" });
      }
    }
  );
  app2.put(
    "/api/campaigns/:id",
    requireAuth,
    validateBody(updateCampaignSchema),
    async (req, res) => {
      try {
        const campaignId = req.params.id;
        const updateData = req.validatedBody;
        const existingCampaign = await storage.getCampaign(campaignId);
        if (!existingCampaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        const currentUser = await storage.getUser(req.session.user.id);
        const isAdmin = currentUser?.isAdmin;
        const isCreator = existingCampaign.createdBy === req.session.user?.id;
        if (!isAdmin && !isCreator) {
          return res.status(403).json({ error: "Permission denied" });
        }
        if (existingCampaign.status !== "active") {
          return res.status(400).json({ error: "Only active campaigns can be edited" });
        }
        const campaignHasStarted = new Date(existingCampaign.startDate) <= /* @__PURE__ */ new Date();
        if (campaignHasStarted) {
          const startDateChanged = updateData.startDate && new Date(updateData.startDate).getTime() !== new Date(existingCampaign.startDate).getTime();
          if (startDateChanged) {
            return res.status(400).json({ error: "Cannot modify start date or time for campaigns that have already started" });
          }
        }
        const updatedCampaign = await storage.updateCampaign(campaignId, updateData);
        if (!updatedCampaign) {
          return res.status(500).json({ error: "Failed to update campaign" });
        }
        logger.info("Campaign updated successfully", {
          method: "PUT",
          path: req.path,
          campaignId,
          userId: req.session.user?.id
        });
        res.json(updatedCampaign);
      } catch (error) {
        logger.error("Error updating campaign", {
          error,
          method: "PUT",
          path: req.path,
          campaignId: req.params.id,
          userId: req.session.user?.id
        });
        res.status(500).json({ error: "Failed to update campaign" });
      }
    }
  );
  app2.patch("/api/campaigns/:id/scan", requireAuth, async (req, res) => {
    try {
      const result = await storage.updateCampaignScanCount(req.params.id);
      if (result.success) {
        logger.info("Campaign scan count updated", {
          method: "PATCH",
          path: req.path
        });
        res.json({ message: "Scan count updated successfully" });
      } else {
        logger.warn("Campaign scan count update failed", {
          method: "PATCH",
          path: req.path,
          reason: result.reason
        });
        res.status(400).json({ error: result.reason || "Failed to update scan count" });
      }
    } catch (error) {
      logger.error("Error updating campaign scan count", {
        error,
        method: "PATCH",
        path: req.path
      });
      res.status(500).json({ error: "Failed to update scan count" });
    }
  });
  app2.get(
    "/api/campaigns/:campaignId/analytics/:date",
    requireAuth,
    async (req, res) => {
      try {
        const campaignId = req.params.campaignId;
        const date = req.params.date || "today";
        const campaign = await storage.getCampaign(campaignId);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        const analytics = await storage.getCampaignAnalytics(campaignId, date);
        logger.info("Campaign analytics fetched successfully", {
          method: "GET",
          path: req.path,
          campaignId,
          date
        });
        res.json(analytics);
      } catch (error) {
        logger.error("Error fetching campaign analytics", {
          error,
          method: "GET",
          path: req.path,
          campaignId: req.params.campaignId,
          date: req.params.date
        });
        res.status(500).json({ error: "Failed to fetch campaign analytics" });
      }
    }
  );
  app2.get(
    "/api/campaigns/:campaignId/scans",
    requireAuth,
    async (req, res) => {
      try {
        const campaignId = req.params.campaignId;
        const campaign = await storage.getCampaign(campaignId);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        const scans = await storage.getScanRecords(campaignId);
        logger.info("Raw scan records fetched successfully", {
          method: "GET",
          path: req.path,
          campaignId,
          count: scans.length
        });
        res.json(scans);
      } catch (error) {
        logger.error("Error fetching scan records", {
          error,
          method: "GET",
          path: req.path,
          campaignId: req.params.campaignId
        });
        res.status(500).json({ error: "Failed to fetch scan records" });
      }
    }
  );
  app2.get("/api/stats/overall", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getOverallStats();
      logger.info("Overall stats fetched successfully", {
        method: "GET",
        path: req.path
      });
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching overall stats", {
        error,
        method: "GET",
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch overall stats" });
    }
  });
  app2.get("/api/users/:userId/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const stats = await storage.getUserStats(userId);
      logger.info("User stats fetched successfully", {
        userId,
        method: "GET",
        path: req.path
      });
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching user stats", {
        error,
        userId: req.params.userId,
        method: "GET",
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });
  app2.get("/api/analytics/overall", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getAnalyticsOverall();
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching analytics overall", {
        error,
        method: "GET",
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });
  app2.get("/api/analytics/top-campaigns", requireAuth, async (req, res) => {
    try {
      const campaigns2 = await storage.getTopCampaigns();
      res.json(campaigns2);
    } catch (error) {
      logger.error("Error fetching top campaigns", {
        error,
        method: "GET",
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch top campaigns" });
    }
  });
  app2.get("/api/analytics/regions", requireAuth, async (req, res) => {
    try {
      const regions = await storage.getRegionStats();
      res.json(regions);
    } catch (error) {
      logger.error("Error fetching region stats", {
        error,
        method: "GET",
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch region stats" });
    }
  });
  app2.get("/api/analytics/user-growth", requireAuth, async (req, res) => {
    try {
      const growth = await storage.getUserGrowthStats();
      res.json(growth);
    } catch (error) {
      logger.error("Error fetching user growth", {
        error,
        method: "GET",
        path: req.path
      });
      res.status(500).json({ error: "Failed to fetch user growth data" });
    }
  });
  app2.post("/api/analytics/add-scan-events", requireAdmin, async (req, res) => {
    try {
      const result = await storage.addNewScanEvents();
      logger.info("Successfully added new scan events", {
        method: "POST",
        path: req.path,
        userId: req.session.user?.id,
        username: req.session.user?.username,
        added: result.added,
        total: result.total
      });
      res.json({
        success: true,
        message: `Added ${result.added} new scan events. Total scan events: ${result.total}`,
        added: result.added,
        total: result.total
      });
    } catch (error) {
      logger.error("Error adding new scan events", {
        error: error instanceof Error ? error.message : String(error),
        method: "POST",
        path: req.path,
        userId: req.session.user?.id,
        username: req.session.user?.username
      });
      res.status(500).json({
        error: "Failed to add new scan events"
      });
    }
  });
  app2.get("/qr-view/:campaignId", async (req, res) => {
    try {
      const campaignId = req.params.campaignId;
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).send(`
          <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Campaign Not Found</h1>
            <p>The QR code you're looking for doesn't exist or has been removed.</p>
          </body></html>
        `);
      }
      const qrUrl = `${req.protocol}://${req.get("host")}/qrcode/${campaign.id}`;
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${campaign.name} - QR Code</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; margin: 0; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
              .campaign-header { margin-bottom: 30px; }
              .campaign-title { color: #333; margin: 0 0 10px 0; font-size: 28px; }
              .campaign-category { color: #6b7280; font-size: 16px; background: #f3f4f6; padding: 5px 15px; border-radius: 20px; display: inline-block; }
              .qr-container { margin: 30px 0; }
              .qr-description { color: #6b7280; font-size: 16px; margin-top: 15px; }
              .campaign-description { margin: 20px 0; color: #374151; line-height: 1.6; }
              .campaign-info { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: left; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
              .info-label { font-weight: bold; color: #374151; }
              .info-value { color: #6b7280; }
              .scan-button { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 20px; }
              .scan-button:hover { background: #2563eb; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="campaign-header">
                <h1 class="campaign-title">${campaign.name}</h1>
                <span class="campaign-category">${campaign.category}</span>
              </div>
              
              ${campaign.description ? `<div class="campaign-description">${campaign.description}</div>` : ""}
              
              <div class="qr-container">
                <canvas id="qr-code"></canvas>
                <p class="qr-description">
                  ${campaign.targetUrl ? "Scan to visit the link" : "Scan this QR code to interact with the campaign"}
                </p>
              </div>
              
              <div class="campaign-info">
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">${campaign.status === "active" ? "\u2705 Active" : "\u274C Expired"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Total Scans:</span>
                  <span class="info-value">${campaign.scanCount.toLocaleString()}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Campaign Period:</span>
                  <span class="info-value">${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}</span>
                </div>
              </div>

              ${campaign.targetUrl && campaign.status === "active" ? `<button class="scan-button" onclick="window.open('${qrUrl}', '_blank')">Visit Link Directly</button>` : ""}
            </div>

            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.getElementById('qr-code'), '${qrUrl}', {
                width: 256,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              }, function (error) {
                if (error) {
                  console.error('QR Code generation failed:', error);
                  document.getElementById('qr-code').innerHTML = '<p style="color: red;">Failed to generate QR code</p>';
                }
              });
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      logger.error("Error displaying QR code", {
        error,
        campaignId: req.params.campaignId,
        method: "GET",
        path: req.path
      });
      res.status(500).send(`
        <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Error</h1>
          <p>Failed to load QR code. Please try again later.</p>
        </body></html>
      `);
    }
  });
  app2.get("/qrcode/:campaignId", async (req, res) => {
    try {
      const campaignId = req.params.campaignId;
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).send(`
          <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Campaign Not Found</h1>
            <p>The QR code you scanned is not valid or the campaign no longer exists.</p>
          </body></html>
        `);
      }
      if (campaign.status === "expired") {
        return res.send(`
          <html>
            <head>
              <title>${campaign.name} - Expired</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .campaign-header { text-align: center; margin-bottom: 20px; }
                .campaign-title { color: #dc2626; margin: 0; }
                .campaign-category { color: #6b7280; font-size: 14px; }
                .error-info { text-align: center; margin-top: 20px; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="campaign-header">
                  <h1 class="campaign-title">${campaign.name}</h1>
                  <p class="campaign-category">${campaign.category}</p>
                </div>
                <div class="error-info">
                  \u274C <strong>Campaign Expired</strong><br>
                  This campaign has reached its scan limit and is no longer active.<br>
                  Total scans reached: ${campaign.scanCount}
                </div>
              </div>
            </body>
          </html>
        `);
      }
      if (campaign.scanLimit && campaign.scanCount >= campaign.scanLimit) {
        return res.send(`
          <html>
            <head>
              <title>${campaign.name} - Scan Limit Reached</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .campaign-header { text-align: center; margin-bottom: 20px; }
                .campaign-title { color: #dc2626; margin: 0; }
                .campaign-category { color: #6b7280; font-size: 14px; }
                .error-info { text-align: center; margin-top: 20px; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="campaign-header">
                  <h1 class="campaign-title">${campaign.name}</h1>
                  <p class="campaign-category">${campaign.category}</p>
                </div>
                <div class="error-info">
                  \u{1F6AB} <strong>Scan Limit Reached</strong><br>
                  This campaign has reached its maximum number of scans (${campaign.scanLimit}).<br>
                  No additional scans will be recorded.
                </div>
              </div>
            </body>
          </html>
        `);
      }
      const clientIP = req.ip || "Unknown";
      const scanEventData = {
        campaignId,
        region: clientIP,
        // Express handles proxy headers securely with trust proxy = 1
        userAgent: req.get("User-Agent") || void 0,
        ipAddress: clientIP
      };
      const scanResult = await storage.recordScanEvent(scanEventData);
      const updatedCampaign = await storage.getCampaign(campaignId);
      logger.info("QR Code scanned successfully", {
        campaignId,
        region: scanEventData.region,
        targetUrl: campaign.targetUrl || "internal",
        method: "GET",
        path: req.path
      });
      if (campaign.targetUrl) {
        return res.redirect(302, campaign.targetUrl);
      }
      res.send(`
        <html>
          <head>
            <title>${campaign.name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .campaign-header { text-align: center; margin-bottom: 20px; }
              .campaign-title { color: #2563eb; margin: 0; }
              .campaign-category { color: #6b7280; font-size: 14px; }
              .campaign-description { margin: 20px 0; line-height: 1.6; color: #374151; }
              .campaign-dates { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .scan-info { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
              .success { background: #f0fdf4; padding: 15px; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="campaign-header">
                <h1 class="campaign-title">${campaign.name}</h1>
                <p class="campaign-category">${campaign.category}</p>
              </div>
              
              ${campaign.description ? `<div class="campaign-description">${campaign.description}</div>` : ""}
              
              <div class="campaign-dates">
                <strong>Campaign Period:</strong><br>
                ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}
              </div>
              
              <div class="success">
                \u2705 <strong>Scan recorded successfully!</strong>
              </div>
              
              <div class="scan-info">
                Total scans: ${updatedCampaign?.scanCount || campaign.scanCount}<br>
                ${campaign.scanLimit ? `Scan limit: ${campaign.scanLimit}` : "No scan limit set"}
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      logger.error("Error processing QR code scan", {
        error,
        campaignId: req.params.campaignId,
        method: "GET",
        path: req.path
      });
      res.status(500).send(`
        <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Error</h1>
          <p>Sorry, there was an error processing your request. Please try again later.</p>
        </body></html>
      `);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.set("trust proxy", 1);
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use(requestLogger);
(async () => {
  const server = await registerRoutes(app);
  app.use(errorHandler);
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
