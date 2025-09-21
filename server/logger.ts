interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  timestamp: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  error?: any;
}

class Logger {
  private logs: LogEntry[] = [];

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, path, method, statusCode, userId } = entry;
    let logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (path && method) {
      logMessage += ` | ${method} ${path}`;
    }
    
    if (statusCode) {
      logMessage += ` | Status: ${statusCode}`;
    }
    
    if (userId) {
      logMessage += ` | User: ${userId}`;
    }
    
    return logMessage;
  }

  private createEntry(
    level: LogEntry['level'], 
    message: string, 
    context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context
    };
  }

  info(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    const entry = this.createEntry('INFO', message, context);
    this.logs.push(entry);
    console.log(this.formatMessage(entry));
  }

  warn(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    const entry = this.createEntry('WARN', message, context);
    this.logs.push(entry);
    console.warn(this.formatMessage(entry));
  }

  error(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    const entry = this.createEntry('ERROR', message, context);
    this.logs.push(entry);
    console.error(this.formatMessage(entry));
    
    if (entry.error) {
      console.error('Error details:', entry.error);
    }
  }

  debug(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createEntry('DEBUG', message, context);
      this.logs.push(entry);
      console.debug(this.formatMessage(entry));
    }
  }

  // API endpoint to get recent logs (for debugging)
  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Clear old logs to prevent memory leaks
  clearOldLogs(keepCount: number = 1000) {
    if (this.logs.length > keepCount) {
      this.logs = this.logs.slice(-keepCount);
    }
  }
}

export const logger = new Logger();

// Middleware for request logging
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  const { method, path } = req;
  const userId = req.session?.user?.id;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const level = statusCode >= 400 ? 'ERROR' : statusCode >= 300 ? 'WARN' : 'INFO';
    
    logger[level.toLowerCase() as 'info' | 'warn' | 'error'](
      `Request completed in ${duration}ms`,
      { method, path, statusCode, userId }
    );
  });

  next();
}

// Global error handler
export function errorHandler(err: any, req: any, res: any, next: any) {
  logger.error('Unhandled error occurred', {
    error: err,
    method: req.method,
    path: req.path,
    userId: req.session?.user?.id
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = isDevelopment ? err.message : 'Internal Server Error';

  res.status(status).json({ 
    error: message,
    ...(isDevelopment && { stack: err.stack })
  });
}