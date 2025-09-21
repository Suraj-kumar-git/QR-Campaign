import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { logger } from "./logger";

// Generic validation middleware factory
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        logger.warn("Request validation failed", {
          method: req.method,
          path: req.path,
          error: result.error.errors,
          userId: (req as any).session?.user?.id
        });

        return res.status(400).json({
          error: "Validation failed",
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      // Add validated data to request object
      (req as any).validatedBody = result.data;
      next();
    } catch (error) {
      logger.error("Validation middleware error", {
        error,
        method: req.method,
        path: req.path,
        userId: (req as any).session?.user?.id
      });
      
      res.status(500).json({ error: "Internal validation error" });
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        logger.warn("Query validation failed", {
          method: req.method,
          path: req.path,
          error: result.error.errors,
          userId: (req as any).session?.user?.id
        });

        return res.status(400).json({
          error: "Query validation failed",
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      (req as any).validatedQuery = result.data;
      next();
    } catch (error) {
      logger.error("Query validation middleware error", {
        error,
        method: req.method,
        path: req.path,
        userId: (req as any).session?.user?.id
      });
      
      res.status(500).json({ error: "Internal validation error" });
    }
  };
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  
  if (!session?.user) {
    logger.warn("Unauthenticated access attempt", {
      method: req.method,
      path: req.path
    });
    
    return res.status(401).json({ error: "Authentication required" });
  }

  logger.debug("Authenticated request", {
    method: req.method,
    path: req.path,
    userId: session.user.id
  });

  next();
}

// Admin authorization middleware
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  
  // First check authentication
  if (!session?.user) {
    logger.warn("Unauthenticated admin access attempt", {
      method: req.method,
      path: req.path
    });
    
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Import storage dynamically to avoid circular import
    const { storage } = await import("./storage");
    
    // Check if user is admin
    const user = await storage.getUser(session.user.id);
    if (!user || !user.isAdmin) {
      logger.warn("Non-admin access attempt", {
        method: req.method,
        path: req.path,
        userId: session.user.id
      });
      
      return res.status(403).json({ error: "Admin access required" });
    }

    logger.debug("Admin authenticated request", {
      method: req.method,
      path: req.path,
      userId: session.user.id
    });

    next();
  } catch (error) {
    logger.error("Admin authorization error", {
      error,
      method: req.method,
      path: req.path,
      userId: session.user.id
    });
    
    res.status(500).json({ error: "Authorization check failed" });
  }
}

// Rate limiting middleware (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for HEAD requests (often used for health checks)
    if (req.method === 'HEAD') {
      return next();
    }
    
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = rateLimitMap.get(key) || { count: 0, lastReset: now };
    
    // Reset counter if window has passed
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
        userId: (req as any).session?.user?.id
      });
      
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((windowMs - (now - clientData.lastReset)) / 1000)
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - clientData.count).toString(),
      'X-RateLimit-Reset': new Date(clientData.lastReset + windowMs).toISOString()
    });
    
    next();
  };
}

// CORS middleware for production
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}