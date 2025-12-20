import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, TrendingUp, Users, Activity, Calendar, Target, QrCode, Globe, Clock, Zap, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

// Analytics interfaces
interface OverallStats {
  totalCampaigns: number;
  totalScans: number;
  totalUsers: number;
  activeCampaigns: number;
  avgScansPerCampaign: number;
}

interface TopCampaign {
  id: string;
  name: string;
  scanCount: number;
  category: string;
  createdAt: string;
}

interface RegionStats {
  region: string;
  scanCount: number;
  percentage: number;
}

interface UserGrowth {
  month: string;
  userCount: number;
  campaignCount: number;
}

export function AnalyticsPage() {
  // Fetch overall statistics
  const { data: overallStats, isLoading: statsLoading } = useQuery<OverallStats>({
    queryKey: ["/api/analytics/overall"],
  });

  // Fetch top performing campaigns
  const { data: topCampaigns, isLoading: campaignsLoading } = useQuery<TopCampaign[]>({
    queryKey: ["/api/analytics/top-campaigns"],
  });

  // Fetch regional analytics
  const { data: regionStats, isLoading: regionLoading } = useQuery<RegionStats[]>({
    queryKey: ["/api/analytics/regions"],
  });

  // Fetch user growth data
  const { data: userGrowth, isLoading: growthLoading } = useQuery<UserGrowth[]>({
    queryKey: ["/api/analytics/user-growth"],
  });

  // Refresh function to reload all analytics data
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/analytics/overall"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/analytics/top-campaigns"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/analytics/regions"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/analytics/user-growth"] });
  };

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2" data-testid="page-description">
            Comprehensive insights into your system performance and user engagement.
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          variant="outline"
          className="flex items-center gap-2"
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card data-testid="metric-campaigns">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <QrCode className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? "..." : overallStats?.totalCampaigns || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "..." : `${overallStats?.activeCampaigns || 0} active`}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-scans">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? "..." : (overallStats?.totalScans || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              all time
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? "..." : overallStats?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              registered
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-average">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Scans</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? "..." : Math.round(overallStats?.avgScansPerCampaign || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              per campaign
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-activity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Activity</CardTitle>
            <Clock className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-indigo-600">
              {regionLoading ? "..." : regionStats?.length ? "Active" : "Quiet"}
            </div>
            <p className="text-xs text-muted-foreground">
              scan activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart className="w-5 h-5" />
              <span>User Growth</span>
            </CardTitle>
            <CardDescription>User registrations and campaigns created over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="chart-user-activity">
              {growthLoading ? (
                <div className="text-center py-8 text-gray-500">Loading user activity...</div>
              ) : userGrowth && userGrowth.length > 0 ? (
                <div className="space-y-3">
                  {userGrowth.slice(0, 6).map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 text-sm font-medium text-gray-600">{month.month}</div>
                        <div className="flex space-x-4">
                          <span className="text-sm text-blue-600">{month.userCount} users</span>
                          <span className="text-sm text-green-600">{month.campaignCount} campaigns</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex space-x-2">
                        <div className="w-16 h-2 bg-blue-200 rounded">
                          <div 
                            className="h-2 bg-blue-600 rounded" 
                            style={{ width: `${Math.min(100, (month.userCount / Math.max(...(userGrowth?.map(g => g.userCount) || [1]))) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="w-16 h-2 bg-green-200 rounded">
                          <div 
                            className="h-2 bg-green-600 rounded" 
                            style={{ width: `${Math.min(100, (month.campaignCount / Math.max(...(userGrowth?.map(g => g.campaignCount) || [1]))) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No user activity data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Regional Activity</span>
            </CardTitle>
            <CardDescription>QR code scans by geographic region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="chart-campaign-performance">
              {regionLoading ? (
                <div className="text-center py-8 text-gray-500">Loading regional data...</div>
              ) : regionStats && regionStats.length > 0 ? (
                <div className="space-y-3">
                  {regionStats.slice(0, 8).map((region, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{region.region}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600">{region.scanCount} scans</span>
                        <div className="hidden sm:inline w-20 h-2 bg-gray-200 rounded">
                          <div 
                            className="h-2 bg-indigo-600 rounded" 
                            style={{ width: `${region.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-10">{region.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No regional data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Top Performing Campaigns</span>
          </CardTitle>
          <CardDescription>Campaigns ranked by total scans and engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" data-testid="top-content">
            {campaignsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading top campaigns...</div>
            ) : topCampaigns && topCampaigns.length > 0 ? (
              topCampaigns.slice(0, 5).map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
                          {campaign.category}
                        </span>
                        <span>Created {format(new Date(campaign.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{campaign.scanCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">total scans</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <QrCode className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No campaigns available</p>
                <p className="text-sm">Create your first campaign to see performance data</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
