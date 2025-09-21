# QR Campaign Management Platform

## Overview
This project is a comprehensive QR campaign management platform enabling secure administration, advanced campaign creation with customizable QR codes, real-time analytics, and sophisticated user management. It offers a full-stack solution for businesses to manage marketing efforts, track engagement, and gather insights through QR code interactions, ultimately enhancing marketing campaigns and understanding user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with custom CSS variables.
- **State Management**: TanStack Query (React Query) for server state.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod validation.

### Backend Architecture
- **Framework**: Express.js with TypeScript on Node.js.
- **API Design**: RESTful API with structured error handling.
- **Request Logging**: Custom middleware for API request/response logging.
- **Development**: tsx for TypeScript execution.
- **Build Process**: esbuild for production bundling.

### Data Layer
- **Database**: In-memory storage using JavaScript Maps for development/demonstration (Drizzle ORM schema preserved for type safety and future PostgreSQL migration).
- **ORM**: Drizzle ORM with type-safe schema definitions.
- **Schema Management**: Shared schema between frontend and backend in `/shared`.
- **Validation**: Zod schemas for runtime type validation.

### Project Structure
- **Monorepo Design**: Frontend (`/client`), backend (`/server`), and shared code (`/shared`).
- **Type Safety**: End-to-end TypeScript with shared types and schemas.

### Core Features
- **Authentication & User Management**: Secure admin authentication, user management, role-based access control, session management, and admin protection.
- **Campaign Management**: Advanced campaign creation, custom QR code generation, file upload system, campaign status management, and bulk operations.
- **QR Code Customization**: Icon overlays, border styling, custom URL redirection, high-resolution export, and dynamic text indicators.
- **Advanced Analytics & Tracking**: Real-time analytics dashboard, region-based tracking, scan event logging, performance metrics, and visual data representation using Recharts.
- **Security & Performance**: Scan rate limiting, comprehensive Zod input validation, SQL injection protection via Drizzle ORM, file upload security, and environment variable management.
- **User Experience**: Mobile-optimized UI, dark/light theme support, real-time updates, client/server-side form validation, loading states, and toast notifications.

## Database Schema & Relations

### **Users Table**
```typescript
users {
  id: varchar (Primary Key, UUID)
  username: text (Unique, Required)
  password: text (Required, bcrypt hashed)
  isActive: boolean (Default: true)
  isAdmin: boolean (Default: false)
  createdAt: timestamp (Auto-generated)
}
```

### **Campaigns Table**
```typescript
campaigns {
  id: varchar (Primary Key, UUID)
  name: text (Required)
  category: text (Required)
  description: text (Optional)
  scanCount: integer (Default: 0)
  scanLimit: integer (Optional)
  status: enum ['active', 'expired'] (Default: 'active')
  startDate: timestamp (Required)
  endDate: timestamp (Required)
  createdBy: varchar (Foreign Key → users.id)
  createdAt: timestamp (Auto-generated)
  updatedAt: timestamp (Auto-updated)
  imageUrl: text (Optional, for campaign images)
  iconPath: text (Optional, for QR code center icons)
  borderStyle: enum ['thick', 'none'] (Default: 'none')
  targetUrl: text (Optional, for custom redirects)
}
```

### **Scan Events Table**
```typescript
scan_events {
  id: varchar (Primary Key, UUID)
  campaignId: varchar (Foreign Key → campaigns.id)
  region: text (Required, IP geolocation)
  scannedAt: timestamp (Auto-generated)
  userAgent: text (Optional, browser info)
  ipAddress: text (Optional, for analytics)
}
```

### **Database Relations**
- **Users → Campaigns**: One-to-Many (createdBy foreign key)
- **Campaigns → Scan Events**: One-to-Many (campaignId foreign key)
- **Cascade Deletions**: Deleting a user removes their campaigns and associated scan events
- **Analytics Aggregations**: Real-time metrics calculated from scan_events table

## App Features

### 🔐 **Authentication & User Management**
- **Secure Admin Authentication**: Session-based authentication with encrypted passwords using bcryptjs
- **User Management System**: Create, activate/deactivate users with admin privileges
- **Role-Based Access Control**: Admin and regular user roles with protected routes
- **Session Management**: Persistent sessions with PostgreSQL session store
- **Admin Protection**: Prevents deactivation of the last active admin user

### 📊 **Campaign Management**
- **Advanced Campaign Creation**: Rich forms with category management, date/time validation, and scan limits
- **Custom QR Code Generation**: Embedded icons, thick borders, and high-resolution downloads
- **File Upload System**: Secure image upload for QR code icons with validation and size limits
- **Campaign Status Management**: Active/expired status with automatic expiration handling
- **Bulk Operations**: Mass campaign management and status updates

### 🎯 **QR Code Customization**
- **Icon Overlays**: Upload custom images to display in QR code centers
- **Border Styling**: Toggle thick borders around QR codes for enhanced visibility
- **Custom URL Redirection**: Redirect QR scans to external websites while preserving analytics
- **High-Resolution Export**: Download QR codes in various sizes for print and digital use
- **Dynamic Text Indicators**: Smart QR descriptions based on destination type

### 📈 **Advanced Analytics & Tracking**
- **Real-Time Analytics Dashboard**: Live metrics with refresh functionality
- **Region-Based Tracking**: IP geolocation with city-level analytics
- **Scan Event Logging**: Comprehensive tracking with user agent and timestamp data
- **Performance Metrics**: Top-performing campaigns, scan counts, and conversion analytics
- **Visual Data Representation**: Charts and graphs using Recharts library
- **Export Capabilities**: Download analytics data and campaign reports

### 🛡️ **Security & Performance**
- **Scan Rate Limiting**: Configurable scan limits per campaign to prevent abuse
- **Input Validation**: Comprehensive Zod schemas for all user inputs
- **SQL Injection Protection**: Parameterized queries using Drizzle ORM
- **File Upload Security**: MIME type validation and size restrictions
- **Environment Variable Management**: Secure secret handling for production

### 📱 **User Experience**
- **Mobile-Optimized UI**: Responsive design with touch-friendly interfaces
- **Dark/Light Theme Support**: System-aware theming with manual toggle
- **Real-Time Updates**: Live data refresh without page reloads
- **Form Validation**: Client and server-side validation with helpful error messages
- **Loading States**: Skeleton screens and loading indicators for better UX
- **Toast Notifications**: User feedback for all actions and errors

## Recent Changes

### September 19, 2025 - Admin Protection Enhancement
- **Last Admin Protection**: Added validation to prevent deactivating the last active admin user
- **Security Improvement**: Shows clear error message "Cannot deactivate the last active admin user. At least one admin must remain active."
- **Admin Recovery**: Ensured admin access recovery through server restart (reactivates "Suraj Kumar" user)
- **System Stability**: Prevents accidental admin lockout scenarios

### September 18, 2025 - Database-Driven Analytics & Refresh Functionality
- **Dynamic Analytics Dashboard**: Replaced static data with real database-driven insights
- **Consistent Refresh Buttons**: Added matching refresh functionality across analytics and campaign detail pages
- **Four Analytics Endpoints**: Total campaigns, scans, users, and regional distribution with proper aggregations
- **Campaign Performance Metrics**: Real-time top performing campaigns with scan counts
- **Enhanced Error Handling**: Graceful fallbacks for database connectivity issues
- **UI Consistency**: Standardized button styling and spacing across pages

### September 18, 2025 - Custom URL Feature & QR Campaign Enhancements
- **Implemented Custom URL Functionality**: Added targetUrl field to campaigns enabling QR codes to redirect to external websites while preserving analytics
- **Enhanced QR Code Tracking**: Modified scan endpoint to record analytics FIRST, then redirect to custom URLs, ensuring no tracking bypass
- **Fixed Form Validation**: Resolved validation mismatch between optional/nullable schema using conditional spread in form submission
- **Improved Visual Feedback**: Added dynamic text indicators - "Scan to visit link" for custom URLs vs "Scan to view campaign" for internal
- **Database Schema Update**: Added nullable targetUrl field with proper URL validation and seamless migration
- **Architecture Preservation**: All existing functionality (scan limits, analytics, region tracking) maintained while adding redirect capability

## External Dependencies

- **Database**: In-memory storage (JavaScript Maps). Drizzle ORM (type-safe SQL toolkit).
- **UI Framework**: Radix UI (accessible component primitives), shadcn/ui (pre-styled Radix components).
- **Icons**: Lucide React (icon library).
- **Styling**: Tailwind CSS.
- **Form & Validation**: React Hook Form, Zod (schema validation library), @hookform/resolvers.
- **State Management**: TanStack Query (server state management).
- **Routing**: Wouter.
- **Authentication**: bcryptjs (password hashing), express-session (session management), connect-pg-simple (PostgreSQL session store), passport + passport-local.
- **File Upload**: Multer (multipart form data handling).
- **QR Code Generation**: qrcode library.
- **Analytics Visualization**: recharts (charting library).
- **Date Utilities**: date-fns.
- **Development Tools**: Vite, tsx, esbuild, @replit/vite-plugins.

## Database Migration to In-Memory Storage

### **Why We Switched from Neon Database to In-Memory Storage**

Originally, the platform was designed to use **Neon (Serverless PostgreSQL)** as the production database. However, during development and for demonstration purposes, we migrated to **in-memory storage** using JavaScript Maps for the following reasons:

### **Technical Reasons**
- **Development Simplicity**: No need to manage database connections, schemas, or environment setup
- **Zero Configuration**: Eliminates the need for DATABASE_URL configuration and connection pooling
- **Instant Reset**: Application restart automatically resets to fresh sample data
- **No External Dependencies**: Removes dependency on external database services during development
- **Faster Development Cycle**: No database setup or migration steps required for new developers

### **Demonstration Benefits**
- **Consistent Sample Data**: Every restart provides the same comprehensive demo dataset
- **No Data Persistence Issues**: Eliminates potential data corruption or inconsistency during demos
- **Predictable State**: Always starts with known user accounts and campaign data
- **Easy Testing**: Fresh state for each testing session without cleanup procedures

### **Architecture Preservation**
Even with in-memory storage, we maintained:
- **Drizzle ORM Schema**: All table definitions and relationships preserved
- **Type Safety**: Full TypeScript integration with database types
- **Query Interface**: Same CRUD operations and storage interface
- **Migration Ready**: Can easily switch back to PostgreSQL when needed

### **Sample Data Population**
The in-memory storage automatically populates with:
- **5 Users**: 1 admin (Suraj Kumar) and 4 regular users
- **29 Campaigns**: Diverse campaigns across different categories and users
- **270+ Scan Events**: Realistic analytics data with regional distribution
- **Mixed Statuses**: Both active and expired campaigns for comprehensive testing

## Use Cases & Testing Scenarios

### **👨‍💼 Admin User Testing (Suraj Kumar / Passsword@123)**
1. **User Management**: Create, activate/deactivate users, test admin protection
2. **System Analytics**: View platform-wide metrics, user distribution, campaign overview
3. **Campaign Oversight**: Access all campaigns across all users
4. **Admin Controls**: Test administrative features and bulk operations

### **👤 Regular User Testing (password123 for all)**
1. **Campaign Creation**: Create campaigns with various categories and settings
2. **QR Customization**: Upload icons, set borders, configure custom URLs  
3. **Analytics Viewing**: Monitor personal campaign performance and scan data
4. **Profile Management**: Update account settings and view activity

### **📊 Analytics & Reporting**
1. **Real-Time Dashboard**: Live metrics with refresh functionality
2. **Regional Distribution**: Geographic scan data visualization
3. **Performance Metrics**: Top campaigns, conversion rates, scan patterns
4. **Time-Based Analysis**: Historical data trends and patterns

### **🎯 QR Code Features**
1. **Custom Redirections**: External URL linking with analytics preservation
2. **Icon Integration**: Image uploads for QR code personalization
3. **Border Styling**: Visual enhancement options
4. **High-Resolution Downloads**: Print and digital export capabilities

### **🔒 Security Testing**
1. **Authentication Flow**: Login/logout, session management
2. **Role-Based Access**: Admin vs regular user permissions
3. **Input Validation**: Form validation and error handling
4. **Rate Limiting**: Scan limit enforcement and abuse prevention
