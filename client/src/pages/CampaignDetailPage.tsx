import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  ArrowLeft,
  QrCode,
  Share2,
  Calendar,
  User,
  Clock,
  BarChart,
  PieChart,
  Copy,
  Mail,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { Link } from "wouter";
import { useState, useRef } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { Campaign, CampaignAnalytics } from "@shared/schema";

export function CampaignDetailPage() {
  const params = useParams() as { campaignId: string };
  const campaignId = params.campaignId;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  // Chart configurations
  const regionChartConfig: ChartConfig = {
    count: {
      label: "Scans",
    },
  };

  const hourlyChartConfig: ChartConfig = {
    count: {
      label: "Scans",
    },
  };

  // Format date for API calls (local date formatting to avoid timezone issues)
  const formatDateForAPI = (date: Date | undefined) => {
    if (!date) return "today";
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return "today";

    // Format as local YYYY-MM-DD to avoid UTC timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get formatted date for display
  const getDisplayDate = (date: Date | undefined) => {
    if (!date) return "today";
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return isToday
      ? "today"
      : date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  const {
    data: campaign,
    isLoading,
    isError,
    error,
    refetch: refetchCampaign,
  } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    enabled: !!campaignId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds to show updated scan counts
  });

  // Fetch analytics data
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery<CampaignAnalytics>({
    queryKey: [
      "/api/campaigns",
      campaignId,
      "analytics",
      formatDateForAPI(selectedDate),
    ],
    enabled: !!campaignId,
  });

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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Function to download QR code with customizations
  const downloadQRCode = async () => {
    if (!campaign) return;

    try {
      const QRCode = (await import("qrcode")).default;
      const qrUrl = `${window.location.origin}/qrcode/${campaign.id}`;
      const downloadSize = 512; // Higher resolution for download

      // Generate base QR code
      const baseQrUrl = await QRCode.toDataURL(qrUrl, {
        width: downloadSize,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      let finalDataURL = baseQrUrl;

      // Apply icon overlay if iconPath exists
      if (campaign.iconPath) {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (ctx) {
            canvas.width = downloadSize;
            canvas.height = downloadSize;

            // Load and draw base QR code
            const qrImage = new Image();
            qrImage.crossOrigin = "anonymous";

            await new Promise((resolve, reject) => {
              qrImage.onload = resolve;
              qrImage.onerror = reject;
              qrImage.src = baseQrUrl;
            });

            ctx.drawImage(qrImage, 0, 0, downloadSize, downloadSize);

            // Load and draw icon overlay
            const iconImage = new Image();
            iconImage.crossOrigin = "anonymous";

            await new Promise((resolve) => {
              iconImage.onload = resolve;
              iconImage.onerror = () => resolve(undefined); // Continue without icon if load fails
              iconImage.src = campaign.iconPath!;
            });

            if (iconImage.complete && iconImage.naturalWidth > 0) {
              // Calculate icon size (about 20% of QR code size)
              const iconSize = Math.floor(downloadSize * 0.2);
              const iconX = (downloadSize - iconSize) / 2;
              const iconY = (downloadSize - iconSize) / 2;

              // Draw white background circle for icon
              const padding = 8; // Larger padding for download
              const circleRadius = (iconSize + padding) / 2;
              ctx.fillStyle = "#FFFFFF";
              ctx.beginPath();
              ctx.arc(
                downloadSize / 2,
                downloadSize / 2,
                circleRadius,
                0,
                2 * Math.PI,
              );
              ctx.fill();

              // Draw icon
              ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
            }

            finalDataURL = canvas.toDataURL("image/png");
          }
        } catch (iconError) {
          console.warn("Failed to add icon to download QR code:", iconError);
          // Continue with base QR code if icon processing fails
        }
      }

      // Apply border styling if needed
      if (campaign.borderStyle === "thick") {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (ctx) {
          const borderWidth = 16;
          const totalSize = downloadSize + borderWidth * 2;

          canvas.width = totalSize;
          canvas.height = totalSize;

          // Draw border background
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, totalSize, totalSize);

          // Draw inner white background
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(
            borderWidth / 2,
            borderWidth / 2,
            downloadSize + borderWidth,
            downloadSize + borderWidth,
          );

          // Draw QR code
          const qrImage = new Image();
          await new Promise((resolve, reject) => {
            qrImage.onload = resolve;
            qrImage.onerror = reject;
            qrImage.src = finalDataURL;
          });

          ctx.drawImage(
            qrImage,
            borderWidth,
            borderWidth,
            downloadSize,
            downloadSize,
          );
          finalDataURL = canvas.toDataURL("image/png");
        }
      }

      // Create download link
      const link = document.createElement("a");
      const filename = `${campaign.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_qr_code.png`;
      link.download = filename;
      link.href = finalDataURL;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Complete",
        description: "QR code has been downloaded with all customizations!",
      });
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download QR code. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to handle sharing
  const handleShare = (platform: string) => {
    if (!campaign) return;

    const qrViewUrl = `${window.location.origin}/qr-view/${campaign.id}`;
    const shareText = `Check out this QR code for "${campaign.name}"`;
    const shareUrl = encodeURIComponent(qrViewUrl);
    const shareTextEncoded = encodeURIComponent(shareText);

    let url = "";

    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTextEncoded}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${shareTextEncoded}&url=${shareUrl}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${shareTextEncoded} ${shareUrl}`;
        break;
      case "instagram":
        // Instagram doesn't support direct URL sharing, so we'll copy to clipboard
        handleCopyLink();
        toast({
          title: "Link Copied!",
          description:
            "Instagram doesn't support direct links. The QR code link has been copied to your clipboard to share manually.",
        });
        return;
      case "email":
        url = `mailto:?subject=${shareTextEncoded}&body=Hi! I wanted to share this QR code with you: ${qrViewUrl}`;
        break;
      case "copy":
        handleCopyLink();
        return;
      default:
        return;
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      setShareDialogOpen(false);
      toast({
        title: "Shared Successfully!",
        description: `QR code shared via ${platform.charAt(0).toUpperCase() + platform.slice(1)}.`,
      });
    }
  };

  // Function to copy link to clipboard
  const handleCopyLink = async () => {
    if (!campaign) return;

    const qrViewUrl = `${window.location.origin}/qr-view/${campaign.id}`;

    try {
      await navigator.clipboard.writeText(qrViewUrl);
      setShareDialogOpen(false);
      toast({
        title: "Link Copied!",
        description: "QR code link has been copied to your clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = qrViewUrl;
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");
        setShareDialogOpen(false);
        toast({
          title: "Link Copied!",
          description: "QR code link has been copied to your clipboard.",
        });
      } catch (fallbackError) {
        toast({
          title: "Copy Failed",
          description:
            "Failed to copy link. Please copy it manually from the address bar.",
          variant: "destructive",
        });
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  // Function to refresh stats
  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      // Manually refetch the queries
      await refetchCampaign();
      await refetchAnalytics();
      toast({
        title: "Refreshed!",
        description: "Campaign stats have been updated with the latest data.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh stats. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="campaign-loading">
        <Link href="/home">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Loading Campaign Details
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we fetch the campaign information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || error) {
    return (
      <div className="space-y-6" data-testid="campaign-error">
        <Link href="/home">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error Loading Campaign
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              There was an error loading the campaign details. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6" data-testid="campaign-not-found">
        <Link href="/home">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Campaign not found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              The campaign you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="campaign-detail-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home">
            <Button variant="outline" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={getCategoryColor(campaign.category)}
            data-testid="campaign-category"
          >
            {campaign.category}
          </Badge>
          <Badge
            className={getStatusColor(campaign.status)}
            data-testid="campaign-status"
          >
            {campaign.status}
          </Badge>
        </div>
      </div>

      {/* Campaign Header */}
      <Card>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 relative z-10 bg-white dark:bg-gray-900 p-4 rounded">
              <h1
                className="text-3xl font-bold text-black dark:text-white mb-4"
                data-testid="campaign-name"
              >
                {campaign.name}
              </h1>

              {/* Campaign Description */}
              {campaign.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                    Description
                  </h3>
                  <p
                    className="text-black dark:text-white"
                    data-testid="campaign-description"
                  >
                    {campaign.description}
                  </p>
                </div>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div
                    className="text-2xl font-bold text-blue-600"
                    data-testid="total-scans"
                  >
                    {campaign.scanCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Scans
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {campaign.status === "active" ? "Active" : "Inactive"}
                  </div>
                  <div className="text-sm text-muted-foreground">Status</div>
                </div>
              </div>
            </div>

            {/* Campaign Image/QR Code with Quick Actions */}
            <div className="space-y-4">
              {/* Quick Actions - positioned above QR code */}
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadQRCode}
                  data-testid="download-qr"
                  className="flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Download</span>
                </Button>

                <Dialog
                  open={shareDialogOpen}
                  onOpenChange={setShareDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="share-campaign"
                      className="flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Share QR Code</DialogTitle>
                      <DialogDescription>
                        Choose how you'd like to share the QR code for "
                        {campaign?.name}".
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-20"
                        onClick={() => handleShare("facebook")}
                        data-testid="share-facebook"
                      >
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                          f
                        </div>
                        Facebook
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-20"
                        onClick={() => handleShare("twitter")}
                        data-testid="share-twitter"
                      >
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold">
                          𝕏
                        </div>
                        Twitter/X
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-20"
                        onClick={() => handleShare("whatsapp")}
                        data-testid="share-whatsapp"
                      >
                        <MessageCircle className="w-8 h-8 text-green-600" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-20"
                        onClick={() => handleShare("instagram")}
                        data-testid="share-instagram"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded flex items-center justify-center text-white font-bold">
                          📷
                        </div>
                        Instagram
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-20"
                        onClick={() => handleShare("email")}
                        data-testid="share-email"
                      >
                        <Mail className="w-8 h-8 text-gray-600" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-20"
                        onClick={() => handleShare("copy")}
                        data-testid="share-copy"
                      >
                        <Copy className="w-8 h-8 text-gray-600" />
                        Copy Link
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={handleRefreshStats}
                  variant="outline"
                  disabled={refreshing}
                  className="flex items-center gap-2"
                  data-testid="refresh-stats"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>

              {/* QR Code */}
              <div
                ref={qrCodeRef}
                className="bg-white p-8 rounded-lg shadow-sm border dark:bg-gray-800 dark:border-gray-700 flex items-center justify-center"
                data-testid="qr-code-container"
              >
                <QRCodeGenerator
                  value={`${window.location.origin}/qrcode/${campaign.id}`}
                  size={200}
                  iconPath={campaign.iconPath || undefined}
                  borderStyle={campaign.borderStyle}
                />
              </div>

              {campaign.targetUrl ? (
                <p className="text-sm text-center text-muted-foreground mt-4">
                  Scan to visit link
                </p>
              ) : (
                <p className="text-sm text-center text-muted-foreground mt-4">
                  Scan to view campaign
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-black font-medium">Analytics for:</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[240px] justify-start text-left font-normal"
              data-testid="date-selector"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {selectedDate ? selectedDate.toDateString() : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date: Date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {/* <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate(new Date())}
          data-testid="today-button"
        >
          Today
        </Button> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Region Analytics - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Scan Analytics by Region
              </CardTitle>
              <CardDescription>
                Distribution of scans across different regions for{" "}
                {getDisplayDate(selectedDate)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div
                  className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  data-testid="region-analytics-loading"
                >
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-muted-foreground">
                      Loading region analytics...
                    </p>
                  </div>
                </div>
              ) : analyticsError ? (
                <div
                  className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  data-testid="region-analytics-error"
                >
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                    <p className="text-orange-600">Login Required</p>
                    <p className="text-sm text-gray-400">
                      Please log in to view region analytics
                    </p>
                  </div>
                </div>
              ) : analytics &&
                analytics.regionData &&
                analytics.regionData.length > 0 ? (
                <div className="h-64" data-testid="region-pie-chart">
                  <ChartContainer
                    config={regionChartConfig}
                    className="h-full aspect-auto"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics.regionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ region, percent }) =>
                            `${region} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="region"
                        >
                          {analytics.regionData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(${index * 45}, 70%, 60%)`}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          formatter={(value, name) => [`${value} scans`, name]}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <div
                  className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  data-testid="no-region-data"
                >
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No regional data available</p>
                    <p className="text-sm text-gray-400">
                      Scans will appear here once region data is recorded
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Analytics - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Hourly Scan Distribution
              </CardTitle>
              <CardDescription>
                Hour-by-hour breakdown of scans for{" "}
                {getDisplayDate(selectedDate)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div
                  className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  data-testid="hourly-analytics-loading"
                >
                  <div className="text-center">
                    <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-muted-foreground">
                      Loading hourly analytics...
                    </p>
                  </div>
                </div>
              ) : analyticsError ? (
                <div
                  className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  data-testid="hourly-analytics-error"
                >
                  <div className="text-center">
                    <BarChart className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                    <p className="text-orange-600">Login Required</p>
                    <p className="text-sm text-gray-400">
                      Please log in to view hourly analytics
                    </p>
                  </div>
                </div>
              ) : analytics && analytics.hourlyData ? (
                <div className="h-64" data-testid="hourly-bar-chart">
                  <ChartContainer
                    config={hourlyChartConfig}
                    className="h-full aspect-auto"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={analytics.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(hour) => `${hour}:00`}
                        />
                        <YAxis />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          labelFormatter={(hour) => `Hour: ${hour}:00`}
                        />
                        <Bar dataKey="count" fill="hsl(200, 70%, 60%)" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <div
                  className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  data-testid="no-hourly-data"
                >
                  <div className="text-center">
                    <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No hourly data available</p>
                    <p className="text-sm text-gray-400">
                      Hourly scan data will appear here once recorded
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Analytics Summary</CardTitle>
              <CardDescription>
                Key metrics for {getDisplayDate(selectedDate)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div
                    className="text-xl font-bold text-blue-600"
                    data-testid="daily-scans"
                  >
                    {analyticsError ? "-" : analytics?.totalScans || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Scans{" "}
                    {getDisplayDate(selectedDate) === "today"
                      ? "Today"
                      : "on " + getDisplayDate(selectedDate)}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xl font-bold text-indigo-600"
                    data-testid="total-campaign-scans"
                  >
                    {campaign.scanCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Campaign Scans
                  </div>
                </div>
                <div>
                  <div
                    className="text-xl font-bold text-green-600"
                    data-testid="total-regions"
                  >
                    {analyticsError ? "-" : analytics?.regionData?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Regions{" "}
                    {getDisplayDate(selectedDate) === "today"
                      ? "Today"
                      : "on " + getDisplayDate(selectedDate)}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xl font-bold text-purple-600"
                    data-testid="peak-hour"
                  >
                    {analyticsError
                      ? "-"
                      : (() => {
                          const peak =
                            analytics?.hourlyData &&
                            analytics.hourlyData.length > 0
                              ? analytics.hourlyData.reduce((max, current) =>
                                  current.count > max.count ? current : max,
                                )
                              : null;
                          return peak?.hour !== undefined
                            ? `${peak.hour}:00`
                            : "N/A";
                        })()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Peak Hour{" "}
                    {getDisplayDate(selectedDate) === "today"
                      ? "Today"
                      : "on " + getDisplayDate(selectedDate)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Campaign Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div data-testid="created-by">
                <div className="text-sm font-medium text-muted-foreground">
                  Created By
                </div>
                <div className="text-foreground">
                  {campaign.createdByUsername || campaign.createdBy}
                </div>
              </div>
              <div data-testid="created-at">
                <div className="text-sm font-medium text-muted-foreground">
                  Created
                </div>
                <div className="text-foreground">
                  {formatDate(campaign.createdAt)}
                </div>
              </div>
              <div data-testid="updated-at">
                <div className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </div>
                <div className="text-foreground">
                  {formatDate(campaign.updatedAt)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
