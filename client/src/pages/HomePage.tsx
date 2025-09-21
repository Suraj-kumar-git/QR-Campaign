import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  BarChart,
  Megaphone,
  QrCode,
  Activity,
  Calendar,
  Eye,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Campaign } from "@shared/schema";
import { Link } from "wouter";
import { AdminNotifications } from "@/components/AdminNotifications";
import { useAuth } from "@/lib/auth";

interface CampaignsResponse {
  campaigns: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OverallStats {
  totalCampaigns: number;
  totalScans: number;
  activeCampaigns: number;
  expiredCampaigns: number;
}

export function HomePage() {
  const { user } = useAuth();
  
  // Fetch only 5 campaigns for home page preview
  const { data, isLoading } = useQuery<CampaignsResponse>({
    queryKey: ['/api/campaigns/live?page=1&limit=5&sortBy=createdAt&sortOrder=desc'],
  });

  // Fetch overall stats for accurate statistics
  const { data: statsData } = useQuery<OverallStats>({
    queryKey: ['/api/stats/overall'],
  });

  const campaigns = data?.campaigns || [];
  const stats = statsData || { totalCampaigns: 0, totalScans: 0, activeCampaigns: 0, expiredCampaigns: 0 };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "contest":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "payment":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "ngo":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatRelativeDate = (date: string | Date) => {
    const now = new Date();
    const targetDate = new Date(date);
    const diffInDays = Math.floor(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Tomorrow";
    if (diffInDays > 0) return `${diffInDays} days left`;
    if (diffInDays === -1) return "Yesterday";
    return `${Math.abs(diffInDays)} days ago`;
  };

  return (
    <div className="space-y-6" data-testid="home-page">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-gray-900 dark:text-white"
            data-testid="page-title"
          >
            Live QR Campaigns
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mt-2"
            data-testid="page-description"
          >
            Manage and monitor your active QR code campaigns.
          </p>
        </div>
        <Link href="/create-campaign">
          <Button
            className="flex items-center space-x-2"
            data-testid="button-create-campaign"
          >
            <Megaphone className="w-4 h-4" />
            <span>Create Campaign</span>
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card data-testid="stats-total-campaigns">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {stats.activeCampaigns}
                </div>
                <div className="text-sm text-gray-500">Live Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-total-scans">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {stats.totalScans}
                </div>
                <div className="text-sm text-gray-500">Total Scans</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-active-campaigns">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {stats.activeCampaigns}
                </div>
                <div className="text-sm text-gray-500">Active Now</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-expired-campaigns">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {stats.expiredCampaigns}
                </div>
                <div className="text-sm text-gray-500">Expired</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Notifications - Only show for admin users */}
      {user?.isAdmin && <AdminNotifications />}

      {/* Recent Campaigns Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Recent Campaigns
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card
              key={i}
              className="animate-pulse"
              data-testid="loading-card"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="campaigns-grid"
        >
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/qr/${campaign.id}`}
              className="block"
              data-testid={`campaign-card-${campaign.id}`}
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold line-clamp-2">
                      {campaign.name}
                    </CardTitle>
                    <Badge
                      className={getStatusColor(campaign.status)}
                      data-testid={`status-${campaign.id}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {campaign.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Campaign Category */}
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className={getCategoryColor(campaign.category)}
                      data-testid={`category-${campaign.id}`}
                    >
                      {campaign.category}
                    </Badge>
                  </div>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span data-testid={`scan-count-${campaign.id}`}>
                        {campaign.scanCount || 0} scans
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span data-testid={`created-date-${campaign.id}`}>
                        Created {formatDate(campaign.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Campaign Dates */}
                  <div className="text-sm text-gray-500 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span data-testid={`end-date-${campaign.id}`}>
                        Ends {formatRelativeDate(campaign.endDate)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* View All Button Card - Only show if there are more than 5 campaigns */}
          {stats.activeCampaigns > 5 && (
            <Link href="/qr" className="block">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-dashed border-2 border-blue-300 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-400">
                <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <ArrowRight className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      View All Campaigns
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      See all {stats.activeCampaigns} live campaigns with advanced filtering and sorting
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900"
                    data-testid="button-view-all-campaigns"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      ) : (
        <Card>
          <CardContent
            className="p-12 text-center"
            data-testid="no-campaigns"
          >
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first QR campaign to get started.
            </p>
            <Link href="/create-campaign">
              <Button>
                <Megaphone className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}