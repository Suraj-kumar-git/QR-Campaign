import { useQuery } from "@tanstack/react-query";
import { Bell, Clock, AlertTriangle, Calendar, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface ExpiringCampaign {
  id: string;
  name: string;
  category: string;
  endDate: string;
  daysLeft: number;
  createdByUsername: string;
}

interface ScanLimitReachedCampaign {
  id: string;
  name: string;
  category: string;
  scanCount: number;
  scanLimit: number;
  createdByUsername: string;
}

interface AdminNotificationsData {
  expiring: ExpiringCampaign[];
  scanLimitReached: ScanLimitReachedCampaign[];
}

export function AdminNotifications() {
  const { data: notifications, isLoading, refetch, error } = useQuery<AdminNotificationsData>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const totalNotifications = (notifications?.expiring.length || 0) + (notifications?.scanLimitReached.length || 0);

  if (error) {
    return (
      <Card data-testid="admin-notifications-error">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Notification Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load notifications. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="admin-notifications-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Admin Notifications</CardTitle>
            {totalNotifications > 0 && (
              <Badge variant="destructive" data-testid="notification-count-badge">
                {totalNotifications}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="refresh-notifications-button"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Stay updated on campaigns that need your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4" data-testid="notifications-loading">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/3"></div>
            </div>
          </div>
        ) : totalNotifications === 0 ? (
          <div className="text-center py-8" data-testid="no-notifications">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No notifications at this time. All campaigns are running smoothly!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Expiring Campaigns */}
            {notifications?.expiring && notifications.expiring.length > 0 && (
              <div data-testid="expiring-campaigns-section">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-sm">Campaigns Expiring Soon</h3>
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    {notifications.expiring.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {notifications.expiring.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="border border-orange-200 rounded-lg p-3 bg-orange-50"
                      data-testid={`expiring-campaign-${campaign.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">
                            {campaign.name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Expires: {format(new Date(campaign.endDate), "MMM dd, yyyy")}
                              </span>
                            </span>
                            <span>Category: {campaign.category}</span>
                            <span>By: {campaign.createdByUsername}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={campaign.daysLeft === 0 ? "destructive" : "secondary"}
                          className="ml-2"
                        >
                          {campaign.daysLeft === 0 ? "Expires Today" : `${campaign.daysLeft} day${campaign.daysLeft > 1 ? 's' : ''} left`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scan Limit Reached */}
            {notifications?.scanLimitReached && notifications.scanLimitReached.length > 0 && (
              <>
                {notifications.expiring && notifications.expiring.length > 0 && (
                  <Separator />
                )}
                <div data-testid="scan-limit-reached-section">
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <h3 className="font-semibold text-sm">Scan Limit Reached</h3>
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      {notifications.scanLimitReached.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {notifications.scanLimitReached.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="border border-red-200 rounded-lg p-3 bg-red-50"
                        data-testid={`scan-limit-campaign-${campaign.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900">
                              {campaign.name}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                              <span>Category: {campaign.category}</span>
                              <span>By: {campaign.createdByUsername}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="mb-1">
                              Limit Reached
                            </Badge>
                            <div className="text-xs text-gray-600">
                              {campaign.scanCount.toLocaleString()} / {campaign.scanLimit.toLocaleString()} scans
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}