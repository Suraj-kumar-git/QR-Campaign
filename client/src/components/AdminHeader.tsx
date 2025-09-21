import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  User,
  Home,
  UserPlus,
  BarChart,
  Megaphone,
  QrCode,
  Settings,
  Menu,
  Bell,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const navItems = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/create-user", label: "Users", icon: UserPlus },
  { path: "/analytics", label: "Stats", icon: BarChart },
  { path: "/create-campaign", label: "Create", icon: Megaphone },
  { path: "/qr", label: "Campaigns", icon: QrCode },
  { path: "/profile", label: "Profile", icon: Settings },
];

interface NotificationData {
  notifications: any[];
  unreadCount: number;
}

// NotificationItem component for individual notification rendering
function NotificationItem({ notification }: { notification: any }) {
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest(`/api/notifications/${notificationId}/mark-read`, {
        method: 'POST',
      }),
    onSuccess: () => {
      // Refresh notifications data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAsReadMutation.mutate(notification.id);
  };

  return (
    <DropdownMenuItem 
      className={`p-4 cursor-default hover:bg-gray-50 dark:hover:bg-gray-800 ${
        notification.isRead ? 'opacity-50' : ''
      }`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="space-y-2 w-full">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {notification.title}
          </h4>
          {!notification.isRead && (
            <button
              onClick={handleMarkAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-2 whitespace-nowrap"
              data-testid={`mark-read-${notification.id}`}
            >
              Mark as read
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Campaign: {notification.campaignName}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {new Date(notification.createdAt).toLocaleString()}
        </p>
      </div>
    </DropdownMenuItem>
  );
}

export function AdminHeader() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Fetch notification data
  const { data: notificationData } = useQuery<NotificationData>({
    queryKey: ['/api/notifications'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (!user) {
    return null; // Don't show header if not authenticated
  }

  const handleLogout = () => {
    logout();
  };

  const handleMobileNavClick = (path: string) => {
    setLocation(path);
  };

  return (
    <header
      className="border-b bg-white dark:bg-gray-900 shadow-sm"
      data-testid="admin-header"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1
              className="text-xl font-bold text-gray-900 dark:text-white"
              data-testid="app-title"
            >
              Admin
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4" data-testid="nav-menu">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Info and Logout */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative p-2"
                  data-testid="notification-trigger"
                >
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  {notificationData?.unreadCount && notificationData.unreadCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0 min-w-0"
                      data-testid="notification-badge"
                    >
                      {notificationData.unreadCount > 9 ? '9+' : notificationData.unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 max-h-96 overflow-y-auto"
                data-testid="notification-dropdown"
              >
                {notificationData?.notifications && notificationData.notifications.length > 0 ? (
                  notificationData.notifications.map((notification: any, index: number) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-center py-4">
                    No notifications
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div
              className="flex items-center space-x-2"
              data-testid="user-info"
            >
              <User className="w-5 h-5 text-gray-400" />
              <span
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                data-testid="username"
              >
                {user.username}
              </span>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>

          {/* Mobile Layout: Username + Notifications + Hamburger Menu */}
          <div className="flex md:hidden items-center space-x-3">
            {/* Mobile Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative p-2"
                  data-testid="mobile-notification-trigger"
                >
                  <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  {notificationData?.unreadCount && notificationData.unreadCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0 min-w-0"
                      data-testid="mobile-notification-badge"
                    >
                      {notificationData.unreadCount > 9 ? '9+' : notificationData.unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 max-h-96 overflow-y-auto"
                data-testid="mobile-notification-dropdown"
              >
                {notificationData?.notifications && notificationData.notifications.length > 0 ? (
                  notificationData.notifications.map((notification: any) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-center py-4">
                    No notifications
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Mobile Username */}
            <div
              className="flex items-center space-x-2"
              data-testid="mobile-user-info"
            >
              <User className="w-4 h-4 text-gray-400" />
              <span
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                data-testid="mobile-username"
              >
                {user.username}
              </span>
            </div>

            {/* Mobile Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="p-2 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  data-testid="mobile-menu-trigger"
                >
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
                data-testid="mobile-menu-content"
              >
                {/* Navigation Items */}
                {navItems.map((item) => {
                  const isActive = location === item.path;
                  const Icon = item.icon;

                  return (
                    <DropdownMenuItem
                      key={item.path}
                      className={`cursor-pointer ${
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                          : ""
                      }`}
                      onClick={() => handleMobileNavClick(item.path)}
                      data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  onClick={handleLogout}
                  data-testid="mobile-logout-button"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
