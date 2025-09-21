import { Link } from "wouter";
import {
  Home,
  UserPlus,
  BarChart,
  Megaphone,
  QrCode,
  Settings,
  Shield,
  Mail,
  Clock,
} from "lucide-react";

export function AdminFooter() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { path: "/home", label: "Dashboard", icon: Home },
    { path: "/create-campaign", label: "Create Campaign", icon: Megaphone },
    { path: "/qr", label: "QR Codes", icon: QrCode },
    { path: "/analytics", label: "Analytics", icon: BarChart },
  ];

  const adminLinks = [
    { path: "/create-user", label: "User Management", icon: UserPlus },
    { path: "/profile", label: "Admin Profile", icon: Settings },
  ];

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                QR Campaign Admin
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Comprehensive campaign management platform for creating, tracking,
              and analyzing QR code campaigns with real-time analytics.
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.path}>
                    <Link href={link.path}>
                      <span className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                        <Icon className="w-4 h-4 mr-2" />
                        {link.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Admin Tools */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Admin Tools
            </h4>
            <ul className="space-y-3">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.path}>
                    <Link href={link.path}>
                      <span className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                        <Icon className="w-4 h-4 mr-2" />
                        {link.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Support & Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Support
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span>admin@qrcampaign.com</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="mb-2">Administrative Access Only</p>
                <p className="text-xs">Secure campaign management portal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              © {currentYear} QR Campaign Platform. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Admin Portal</span>
              </span>
              <span>Secure Access</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
