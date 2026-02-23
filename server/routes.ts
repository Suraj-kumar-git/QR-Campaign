import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertCampaignSchema,
  updateCampaignSchema,
  updateUserStatusSchema,
  createUserByAdminSchema,
  changePasswordApiSchema,
  insertNotificationSchema,
} from "@shared/schema";
import session from "express-session";
import { z } from "zod";
import {
  validateBody,
  requireAuth,
  requireAdmin,
  rateLimit,
  securityHeaders,
} from "./middleware";
import { logger } from "./logger";
import multer from "multer";
import path from "path";
import fs from "fs/promises";


// Extend session data interface
declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      // Only allow image files for QR code icons
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for QR code icons'));
      }
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit
    }
  });

  // Apply security headers
  app.use(securityHeaders);

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // Handle HEAD requests to /api (often used for health checks) - BEFORE rate limiting
  app.head("/api-test", (req, res) => {
    res.status(200).end();
  });

  // Apply rate limiting to API routes
  app.use("/api", rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

  // Configure session middleware
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to false for Replit development/production
        httpOnly: true,
        sameSite: "lax", // Changed from 'strict' to 'lax' for better compatibility
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  // Auth routes
  const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  });

  app.post(
    "/api/auth/register",
    validateBody(insertUserSchema),
    async (req, res) => {
      try {
        const validatedData = (req as any).validatedBody;

        // Check if username already exists
        const existingUser = await storage.getUserByUsername(
          validatedData.username,
        );
        if (existingUser) {
          logger.warn("Registration attempt with existing username", {
            username: validatedData.username,
            method: req.method,
            path: req.path,
          });
          return res.status(409).json({ error: "Username already exists" });
        }

        const newUser = await storage.createUser(validatedData);

        // Auto-login after successful registration
        req.session.user = {
          id: newUser.id,
          username: newUser.username,
        };

        logger.info("User registered successfully", {
          userId: newUser.id,
          username: newUser.username,
          method: req.method,
          path: req.path,
        });

        res.status(201).json({
          message: "User created successfully",
          user: { id: newUser.id, username: newUser.username },
        });
      } catch (error) {
        logger.error("Registration failed", {
          error,
          method: req.method,
          path: req.path,
        });
        res.status(500).json({ error: "Registration failed" });
      }
    },
  );

  app.post("/api/auth/login", validateBody(loginSchema), async (req, res) => {
    try {
      const validatedData = (req as any).validatedBody;

      const user = await storage.validateUser(
        validatedData.username,
        validatedData.password,
      );
      if (!user) {
        logger.warn("Failed login attempt", {
          username: validatedData.username,
          method: req.method,
          path: req.path,
        });
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
      };

      logger.info("User logged in successfully", {
        userId: user.id,
        username: user.username,
        method: req.method,
        path: req.path,
      });

      res.json({
        message: "Login successful",
        user: { id: user.id, username: user.username },
      });
    } catch (error) {
      logger.error("Login failed", {
        error,
        method: req.method,
        path: req.path,
      });
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Change password endpoint
  app.patch(
    "/api/auth/change-password",
    requireAuth,
    validateBody(changePasswordApiSchema),
    async (req, res) => {
      try {
        const { currentPassword, newPassword } = (req as any).validatedBody;
        const session = (req as any).session;

        await storage.changePassword(session.user.id, {
          oldPassword: currentPassword,
          newPassword,
        });

        logger.info("Password changed successfully", {
          userId: session.user.id,
          method: req.method,
          path: req.path,
        });

        res.json({ message: "Password changed successfully" });
      } catch (error: any) {
        logger.warn("Password change failed", {
          error: error.message,
          userId: (req as any).session?.user?.id,
          method: req.method,
          path: req.path,
        });

        res
          .status(400)
          .json({ error: error.message || "Failed to change password" });
      }
    },
  );

  // Note: requireAuth middleware is imported from ./middleware

  // Get all users (admin-only endpoint)
  app.get("/api/users", requireAdmin, async (_req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const notifications = await storage.getAdminNotifications();
      
      logger.info("Admin notifications fetched", {
        expiringCount: notifications.expiring.length,
        scanLimitReachedCount: notifications.scanLimitReached.length,
        userId: (req as any).session.user.id,
        method: req.method,
        path: req.path,
      });

      res.json(notifications);
    } catch (error: any) {
      logger.error("Failed to fetch admin notifications", { 
        error: error.message,
        userId: (req as any).session?.user?.id,
        method: req.method,
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch admin notifications" });
    }
  });

  // GET /api/notifications - Get user notifications with unread count
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const notifications = await storage.getUserNotifications(userId);
      const unreadCount = await storage.getUnreadNotificationCount(userId);
      
      logger.info("User notifications fetched successfully", {
        method: "GET",
        path: req.path,
        userId: userId,
        username: req.session.user?.username,
        totalNotifications: notifications.length,
        unreadCount: unreadCount
      });
      
      res.json({
        notifications,
        unreadCount
      });
    } catch (error: any) {
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

  // POST /api/notifications - Create a new notification
  app.post("/api/notifications", requireAuth, validateBody(insertNotificationSchema), async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const validatedData = (req as any).validatedBody;
      
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
        userId: userId,
        username: req.session.user?.username,
        notificationId: notification.id,
        title: notification.title
      });
      
      res.status(201).json(notification);
    } catch (error: any) {
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

  // POST /api/notifications/:id/mark-read - Mark notification as read
  app.post("/api/notifications/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.session.user!.id;
      
      const success = await storage.markNotificationAsRead(notificationId, userId);
      
      if (!success) {
        return res.status(404).json({ error: "Notification not found or access denied" });
      }
      
      logger.info("Notification marked as read", {
        method: "POST",
        path: req.path,
        userId: userId,
        username: req.session.user?.username,
        notificationId: notificationId
      });
      
      res.json({ success: true });
    } catch (error: any) {
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

  // POST /api/admin/generate-notifications - Generate notifications for admins
  app.post("/api/admin/generate-notifications", requireAdmin, async (req, res) => {
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
    } catch (error: any) {
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

  // Create a new user by admin (admin-only endpoint)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const result = createUserByAdminSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid user data", details: result.error.issues });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(
        result.data.username,
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

  // Get user by ID (admin-only endpoint)
  app.get("/api/users/:id", requireAdmin, async (req, res) => {
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

  // Update user status (admin-only endpoint)
  app.patch("/api/users/:id/status", requireAdmin, async (req, res) => {
    try {
      const result = updateUserStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid status data", details: result.error.issues });
      }

      const session = (req as any).session;
      const currentUserId = session.user.id;
      const targetUserId = req.params.id;

      // If deactivating a user, check if it's the last active user
      if (result.data.isActive === false) {
        const allUsers = await storage.getUsers();
        const activeUsers = allUsers.filter(user => user.isActive);
        
        // Check if this would be the last active user
        if (activeUsers.length === 1 && activeUsers[0].id === targetUserId) {
          return res.status(400).json({ 
            error: "Cannot deactivate the last active user",
            message: "There must be at least one active user in the system."
          });
        }
      }

      const updatedUser = await storage.updateUserStatus(
        req.params.id,
        result.data,
      );
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user deactivated their own account, destroy the session (logout)
      if (targetUserId === currentUserId && result.data.isActive === false) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            // Still return success since user was deactivated
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

  // Backfill IP addresses to location names (admin-only endpoint)
  app.post("/api/admin/backfill-locations", requireAdmin, async (req, res) => {
    try {
      await storage.backfillIPToLocation();
      res.json({ success: true, message: 'IP addresses successfully converted to location names' });
    } catch (error) {
      console.error('Backfill error:', error);
      res.status(500).json({ error: 'Failed to backfill locations' });
    }
  });

  // Campaign endpoints

  // Get all live campaigns (protected endpoint)
  app.get("/api/campaigns/live", requireAuth, async (req, res) => {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      
      // Parse sorting parameters
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
      
      // Parse filtering parameters
      const filterCategory = req.query.filterCategory as string;
      const filterUser = req.query.filterUser as string;

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "Invalid pagination parameters" });
      }
      
      // Validate sort parameters
      const validSortFields = ['createdAt', 'endDate', 'scanCount', 'name'];
      if (!validSortFields.includes(sortBy)) {
        return res.status(400).json({ error: "Invalid sort field" });
      }

      const result = await storage.getLiveCampaigns(page, limit, sortBy, sortOrder, filterCategory, filterUser);
      res.json(result);
    } catch (error) {
      logger.error("Error fetching live campaigns", {
        error,
        method: "GET",
        path: "/api/campaigns/live",
      });
      res.status(500).json({ error: "Failed to fetch live campaigns" });
    }
  });

  // Get campaign categories for filtering (protected endpoint)
  app.get("/api/campaigns/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCampaignCategories();
      res.json(categories);
    } catch (error) {
      logger.error("Error fetching campaign categories", {
        error,
        method: "GET",
        path: "/api/campaigns/categories",
      });
      res.status(500).json({ error: "Failed to fetch campaign categories" });
    }
  });

  // Get campaign users for filtering (protected endpoint)
  app.get("/api/campaigns/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getCampaignUsers();
      res.json(users);
    } catch (error) {
      logger.error("Error fetching campaign users", {
        error,
        method: "GET",
        path: "/api/campaigns/users",
      });
      res.status(500).json({ error: "Failed to fetch campaign users" });
    }
  });

  // Get campaign by ID (protected endpoint)
  app.get("/api/campaigns/:id", requireAuth, async (req, res) => {
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
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  // File upload endpoint for QR code icons (protected endpoint)
  app.post(
    "/api/upload/icon",
    requireAuth,
    upload.single('icon'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Return the file path for use in campaign creation
        const iconPath = `/uploads/${req.file.filename}`;
        logger.info("Icon uploaded successfully", {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          userId: req.session.user!.id,
          method: "POST",
          path: "/api/upload/icon",
        });
        res.json({ iconPath });
      } catch (error) {
        logger.error("Error uploading icon", {
          error,
          userId: req.session.user?.id,
          method: "POST",
          path: "/api/upload/icon",
        });
        res.status(500).json({ error: "Failed to upload icon" });
      }
    },
  );

  // Create a new campaign (protected endpoint)
  app.post(
    "/api/campaigns",
    requireAuth,
    validateBody(insertCampaignSchema),
    async (req, res) => {
      try {
        const validatedData = (req as any).validatedBody;

        // Add the creator's ID from the session
        const campaignData = {
          ...validatedData,
          createdBy: req.session.user!.id,
        };

        const newCampaign = await storage.createCampaign(campaignData);
        logger.info("Campaign created successfully", {
          campaignId: newCampaign.id,
          campaignName: newCampaign.name,
          createdBy: req.session.user!.id,
          method: "POST",
          path: "/api/campaigns",
        });
        res.status(201).json(newCampaign);
      } catch (error) {
        logger.error("Error creating campaign", {
          error,
          userId: req.session.user?.id,
          method: "POST",
          path: "/api/campaigns",
        });
        res.status(500).json({ error: "Failed to create campaign" });
      }
    },
  );

  // Update campaign (protected endpoint)
  app.put(
    "/api/campaigns/:id",
    requireAuth,
    validateBody(updateCampaignSchema),
    async (req, res) => {
      try {
        const campaignId = req.params.id;
        const updateData = (req as any).validatedBody;

        // Check if campaign exists
        const existingCampaign = await storage.getCampaign(campaignId);
        if (!existingCampaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        // Check if user has permission to edit this campaign (admin or creator)
        const currentUser = await storage.getUser(req.session.user!.id);
        const isAdmin = currentUser?.isAdmin;
        const isCreator = existingCampaign.createdBy === req.session.user?.id;

        if (!isAdmin && !isCreator) {
          return res.status(403).json({ error: "Permission denied" });
        }

        // Only allow editing active campaigns
        if (existingCampaign.status !== "active") {
          return res.status(400).json({ error: "Only active campaigns can be edited" });
        }

        // Check if campaign has already started - if so, prevent start date/time modifications
        const campaignHasStarted = new Date(existingCampaign.startDate) <= new Date();
        if (campaignHasStarted) {
          // If campaign has started, don't allow changes to start date/time
          // Only check if values are actually different from existing ones
          const startDateChanged = updateData.startDate && 
            new Date(updateData.startDate).getTime() !== new Date(existingCampaign.startDate).getTime();
          
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
          userId: req.session.user?.id,
        });

        res.json(updatedCampaign);
      } catch (error) {
        logger.error("Error updating campaign", {
          error,
          method: "PUT",
          path: req.path,
          campaignId: req.params.id,
          userId: req.session.user?.id,
        });
        res.status(500).json({ error: "Failed to update campaign" });
      }
    },
  );

  // Update campaign scan count (protected endpoint)
  app.patch("/api/campaigns/:id/scan", requireAuth, async (req, res) => {
    try {
      const result = await storage.updateCampaignScanCount(req.params.id);
      if (result.success) {
        logger.info("Campaign scan count updated", {
          method: "PATCH",
          path: req.path,
        });
        res.json({ message: "Scan count updated successfully" });
      } else {
        logger.warn("Campaign scan count update failed", {
          method: "PATCH",
          path: req.path,
          reason: result.reason,
        });
        res.status(400).json({ error: result.reason || "Failed to update scan count" });
      }
    } catch (error) {
      logger.error("Error updating campaign scan count", {
        error,
        method: "PATCH",
        path: req.path,
      });
      res.status(500).json({ error: "Failed to update scan count" });
    }
  });

  // Get campaign analytics (protected endpoint)
  app.get(
    "/api/campaigns/:campaignId/analytics/:date",
    requireAuth,
    async (req, res) => {
      try {
        const campaignId = req.params.campaignId;
        const date = req.params.date || "today";

        // Validate that the campaign exists
        const campaign = await storage.getCampaign(campaignId);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        const analytics = await storage.getCampaignAnalytics(campaignId, date);
        logger.info("Campaign analytics fetched successfully", {
          method: "GET",
          path: req.path,
          campaignId,
          date,
        });
        res.json(analytics);
      } catch (error) {
        logger.error("Error fetching campaign analytics", {
          error,
          method: "GET",
          path: req.path,
          campaignId: req.params.campaignId,
          date: req.params.date,
        });
        res.status(500).json({ error: "Failed to fetch campaign analytics" });
      }
    },
  );

  // API to get raw scan records for a campaign (for verification and debugging)
  app.get(
    "/api/campaigns/:campaignId/scans",
    requireAuth,
    async (req, res) => {
      try {
        const campaignId = req.params.campaignId;

        // Validate that the campaign exists
        const campaign = await storage.getCampaign(campaignId);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        // Get raw scan records for this campaign
        const scans = await storage.getScanRecords(campaignId);
        logger.info("Raw scan records fetched successfully", {
          method: "GET",
          path: req.path,
          campaignId,
          count: scans.length,
        });
        res.json(scans);
      } catch (error) {
        logger.error("Error fetching scan records", {
          error,
          method: "GET",
          path: req.path,
          campaignId: req.params.campaignId,
        });
        res.status(500).json({ error: "Failed to fetch scan records" });
      }
    },
  );

  // Get overall stats (protected endpoint)
  app.get("/api/stats/overall", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getOverallStats();
      logger.info("Overall stats fetched successfully", {
        method: "GET",
        path: req.path,
      });
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching overall stats", {
        error,
        method: "GET",
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch overall stats" });
    }
  });

  // Get user stats (protected endpoint)
  app.get("/api/users/:userId/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const stats = await storage.getUserStats(userId);
      logger.info("User stats fetched successfully", {
        userId,
        method: "GET",
        path: req.path,
      });
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching user stats", {
        error,
        userId: req.params.userId,
        method: "GET",
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/overall", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getAnalyticsOverall();
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching analytics overall", {
        error,
        method: "GET",
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });

  app.get("/api/analytics/top-campaigns", requireAuth, async (req, res) => {
    try {
      const campaigns = await storage.getTopCampaigns();
      res.json(campaigns);
    } catch (error) {
      logger.error("Error fetching top campaigns", {
        error,
        method: "GET",
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch top campaigns" });
    }
  });

  app.get("/api/analytics/regions", requireAuth, async (req, res) => {
    try {
      const regions = await storage.getRegionStats();
      res.json(regions);
    } catch (error) {
      logger.error("Error fetching region stats", {
        error,
        method: "GET",
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch region stats" });
    }
  });

  app.get("/api/analytics/user-growth", requireAuth, async (req, res) => {
    try {
      const growth = await storage.getUserGrowthStats();
      res.json(growth);
    } catch (error) {
      logger.error("Error fetching user growth", {
        error,
        method: "GET",
        path: req.path,
      });
      res.status(500).json({ error: "Failed to fetch user growth data" });
    }
  });

  // Add new scan events to all campaigns while preserving existing data (admin only)
  app.post("/api/analytics/add-scan-events", requireAdmin, async (req, res) => {
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

  // QR Code display route (for sharing links in browser)
  app.get("/qr-view/:campaignId", async (req, res) => {
    try {
      const campaignId = req.params.campaignId;
      
      // Check if campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).send(`
          <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Campaign Not Found</h1>
            <p>The QR code you're looking for doesn't exist or has been removed.</p>
          </body></html>
        `);
      }

      // Generate QR code for scanning
      const qrUrl = `${req.protocol}://${req.get('host')}/qrcode/${campaign.id}`;

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
              
              ${campaign.description ? `<div class="campaign-description">${campaign.description}</div>` : ''}
              
              <div class="qr-container">
                <canvas id="qr-code"></canvas>
                <p class="qr-description">
                  ${campaign.targetUrl ? 'Scan to visit the link' : 'Scan this QR code to interact with the campaign'}
                </p>
              </div>
              
              <div class="campaign-info">
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">${campaign.status === 'active' ? '✅ Active' : '❌ Expired'}</span>
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

              ${campaign.targetUrl && campaign.status === 'active' ? 
                `<button class="scan-button" onclick="window.open('${qrUrl}', '_blank')">Visit Link Directly</button>` : 
                ''}
            </div>

            <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
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
        path: req.path,
      });
      res.status(500).send(`
        <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Error</h1>
          <p>Failed to load QR code. Please try again later.</p>
        </body></html>
      `);
    }
  });

  // QR Code scan endpoint (public - no auth required)
  app.get("/qrcode/:campaignId", async (req, res) => {
    try {
      const campaignId = req.params.campaignId;
      
      // Check if campaign exists and is active
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).send(`
          <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Campaign Not Found</h1>
            <p>The QR code you scanned is not valid or the campaign no longer exists.</p>
          </body></html>
        `);
      }
      
      // Check if campaign is expired
      if (campaign.status === 'expired') {
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
                  ❌ <strong>Campaign Expired</strong><br>
                  This campaign has reached its scan limit and is no longer active.<br>
                  Total scans reached: ${campaign.scanCount}
                </div>
              </div>
            </body>
          </html>
        `);
      }
      
      // Check if scan limit is already reached
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
                  🚫 <strong>Scan Limit Reached</strong><br>
                  This campaign has reached its maximum number of scans (${campaign.scanLimit}).<br>
                  No additional scans will be recorded.
                </div>
              </div>
            </body>
          </html>
        `);
      }
      
      // Record scan event (Express now properly resolves client IP via trusted proxy)
      const clientIP = req.ip || 'Unknown';
      const scanEventData = {
        campaignId,
        region: clientIP, // Express handles proxy headers securely with trust proxy = 1
        userAgent: req.get('User-Agent') || undefined,
        ipAddress: clientIP
      };
      
      const scanResult = await storage.recordScanEvent(scanEventData);
      
      // Get updated campaign data to show correct scan count
      const updatedCampaign = await storage.getCampaign(campaignId);
      
      logger.info("QR Code scanned successfully", {
        campaignId,
        region: scanEventData.region,
        targetUrl: campaign.targetUrl || "internal",
        method: "GET",
        path: req.path,
      });
      
      // If campaign has custom target URL, redirect there after tracking
      if (campaign.targetUrl) {
        return res.redirect(302, campaign.targetUrl);
      }
      
      // Otherwise, show success page with correct scan count
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
              
              ${campaign.description ? `<div class="campaign-description">${campaign.description}</div>` : ''}
              
              <div class="campaign-dates">
                <strong>Campaign Period:</strong><br>
                ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}
              </div>
              
              <div class="success">
                ✅ <strong>Scan recorded successfully!</strong>
              </div>
              
              <div class="scan-info">
                Total scans: ${updatedCampaign?.scanCount || campaign.scanCount}<br>
                ${campaign.scanLimit ? `Scan limit: ${campaign.scanLimit}` : 'No scan limit set'}
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
        path: req.path,
      });
      res.status(500).send(`
        <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Error</h1>
          <p>Sorry, there was an error processing your request. Please try again later.</p>
        </body></html>
      `);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
