import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isActive: true,
});

// Schema for updating user status (activate/deactivate)
export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

// Schema for password change (client-side with confirmation)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

// Schema for password change API (server-side without confirmation)
export const changePasswordApiSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

// Schema for creating users by admin
export const createUserByAdminSchema = insertUserSchema.extend({
  isAdmin: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, 'password'>;
export type UpdateUserStatus = z.infer<typeof updateUserStatusSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type CreateUserByAdmin = z.infer<typeof createUserByAdminSchema>;

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"), // Campaign description
  scanCount: integer("scan_count").default(0).notNull(),
  scanLimit: integer("scan_limit"), // Optional scan limit for rate limiting
  status: text("status", { enum: ["active", "expired"] }).default("active").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
  imageUrl: text("image_url"), // Optional campaign image
  iconPath: text("icon_path"), // Optional QR code icon file path
  borderStyle: text("border_style", { enum: ["thick", "none"] }).default("none").notNull(), // QR code border style
  targetUrl: text("target_url"), // Custom URL for QR code destination
});

// Scan events table for analytics
export const scanEvents = pgTable("scan_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  region: text("region").notNull(), // Region where scan occurred
  scannedAt: timestamp("scanned_at").default(sql`now()`).notNull(),
  userAgent: text("user_agent"), // Optional user agent for additional analytics
  ipAddress: text("ip_address"), // Optional IP for region detection
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  scanCount: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().or(z.date()).transform(val => new Date(val)),
  endDate: z.string().or(z.date()).transform(val => new Date(val)),
  scanLimit: z.number().int().positive().optional(),
  borderStyle: z.enum(["thick", "none"]).default("none"),
  targetUrl: z.string().url("Please enter a valid URL").optional().nullable(),
});

// Update campaign schema (for editing existing campaigns)
export const updateCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  scanCount: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  status: true, // Status is managed automatically
}).extend({
  startDate: z.string().or(z.date()).transform(val => new Date(val)),
  endDate: z.string().or(z.date()).transform(val => new Date(val)),
  scanLimit: z.number().int().positive().optional().nullable(),
  borderStyle: z.enum(["thick", "none"]).default("none"),
  targetUrl: z.string().url("Please enter a valid URL").optional().nullable(),
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect & {
  createdByUsername?: string | null;
};

// Scan events schema and types
export const insertScanEventSchema = createInsertSchema(scanEvents).omit({
  id: true,
  scannedAt: true,
});

export type InsertScanEvent = z.infer<typeof insertScanEventSchema>;
export type ScanEvent = typeof scanEvents.$inferSelect;

// Notifications table for tracking admin notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type", { enum: ["expiring_campaign", "scan_limit_reached"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  campaignName: text("campaign_name"),
  userId: varchar("user_id").notNull().references(() => users.id), // Admin user who should see this
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Analytics data types
export interface RegionAnalytics {
  region: string;
  count: number;
}

export interface HourlyAnalytics {
  hour: number;
  count: number;
}

export interface CampaignAnalytics {
  regionData: RegionAnalytics[];
  hourlyData: HourlyAnalytics[];
  totalScans: number;
  date: string;
}

// Login schema for authentication
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
