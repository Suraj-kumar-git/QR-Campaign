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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  BarChart,
  Megaphone,
  QrCode,
  Activity,
  Calendar,
  Eye,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Edit,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Campaign } from "@shared/schema";
import { Link } from "wouter";
import { useState, useEffect } from "react";
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

export function QRCodeListPage() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: "12",
    sortBy,
    sortOrder,
  });

  if (filterCategory && filterCategory !== "all")
    queryParams.append("filterCategory", filterCategory);
  if (filterUser && filterUser !== "all")
    queryParams.append("filterUser", filterUser);

  // Fetch live campaigns with pagination, sorting, and filtering
  const { data, isLoading } = useQuery<CampaignsResponse>({
    queryKey: ['/api/campaigns/live', currentPage, sortBy, sortOrder, filterCategory, filterUser],
    queryFn: () => fetch(`/api/campaigns/live?${queryParams.toString()}`).then(res => res.json()),
  });

  // Fetch available categories for filtering
  const { data: categories } = useQuery<string[]>({
    queryKey: ["/api/campaigns/categories"],
  });

  // Fetch available users for filtering
  const { data: users } = useQuery<{ id: string; username: string }[]>({
    queryKey: ["/api/campaigns/users"],
  });

  const campaigns = data?.campaigns || [];
  const pagination = data?.pagination;

  // Handle edge case: clamp currentPage if it exceeds totalPages
  useEffect(() => {
    if (
      pagination &&
      pagination.totalPages > 0 &&
      currentPage > pagination.totalPages
    ) {
      setCurrentPage(Math.min(currentPage, pagination.totalPages));
    } else if (pagination && pagination.totalPages === 0) {
      setCurrentPage(1);
    }
  }, [pagination, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder, filterCategory, filterUser]);

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split("-");
    setSortBy(newSortBy);
    setSortOrder(newSortOrder as "asc" | "desc");
  };

  const handleClearFilters = () => {
    setFilterCategory("all");
    setFilterUser("all");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

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

  // Check if current user can edit a campaign
  const canEditCampaign = (campaign: Campaign) => {
    if (!user) return false;
    if (campaign.status !== "active") return false;
    
    // Admins can edit any campaign, creators can edit their own
    return user.isAdmin || campaign.createdBy === user.id;
  };

  return (
    <div className="space-y-6" data-testid="qr-page">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-gray-900 dark:text-white"
            data-testid="page-title"
          >
            All QR Campaigns
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mt-2"
            data-testid="page-description"
          >
            Manage and monitor all your QR code campaigns with advanced filtering and sorting.
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          QR Campaigns
        </h2>

        {/* Sorting and Filtering Controls */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          {/* Sort Dropdown */}
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Latest First</SelectItem>
              <SelectItem value="endDate-asc">Expiring First</SelectItem>
              <SelectItem value="scanCount-desc">Max Scan Count</SelectItem>
              <SelectItem value="scanCount-asc">Min Scan Count</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger
              className="w-full sm:w-36"
              data-testid="select-category-filter"
            >
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User Filter */}
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-full sm:w-32" data-testid="select-user-filter">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            data-testid="button-clear-filters"
            className={`w-full sm:w-auto ${
              (filterCategory !== "all" ||
              filterUser !== "all" ||
              sortBy !== "createdAt" ||
              sortOrder !== "desc") 
                ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:border-red-700 dark:text-red-100"
                : "opacity-50"
            }`}
            disabled={
              filterCategory === "all" &&
              filterUser === "all" &&
              sortBy === "createdAt" &&
              sortOrder === "desc"
            }
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          data-testid="campaigns-grid"
        >
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="h-full hover:shadow-lg transition-shadow relative" data-testid={`campaign-card-${campaign.id}`}>
              {/* Edit button for campaigns user can edit */}
              {canEditCampaign(campaign) && (
                <div className="absolute top-3 right-3 z-10">
                  <Link href={`/edit-campaign/${campaign.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                      data-testid={`button-edit-${campaign.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
              
              <Link
                href={`/qr/${campaign.id}`}
                className="block"
              >
                <CardHeader>
                  <div className="flex items-start justify-between pr-12">
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
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent
            className="p-12 text-center"
            data-testid="no-campaigns"
          >
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No campaigns found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Try adjusting your filters or create a new campaign.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                data-testid="button-clear-filters-empty"
              >
                Clear Filters
              </Button>
              <Link href="/create-campaign">
                <Button>
                  <Megaphone className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            {/* Desktop Pagination */}
            <div className="hidden sm:flex items-center justify-between">
              <div
                className="text-sm text-gray-600 dark:text-gray-300"
                data-testid="text-pagination-summary"
              >
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                )}{" "}
                of {pagination.total} campaigns
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {/* Page numbers */}
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                          data-testid={`button-page-${pageNum}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    },
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1),
                    )
                  }
                  disabled={currentPage >= pagination.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Pagination */}
            <div className="sm:hidden">
              <div className="text-xs text-gray-600 dark:text-gray-300 text-center mb-3">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-prev-page-mobile"
                  className="flex-1 mr-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>

                <div className="flex items-center space-x-1">
                  {/* Show fewer page numbers on mobile */}
                  {Array.from(
                    { length: Math.min(3, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage === 1) {
                        pageNum = i + 1;
                      } else if (currentPage === pagination.totalPages) {
                        pageNum = pagination.totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                          data-testid={`button-page-${pageNum}-mobile`}
                        >
                          {pageNum}
                        </Button>
                      );
                    },
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1),
                    )
                  }
                  disabled={currentPage >= pagination.totalPages}
                  data-testid="button-next-page-mobile"
                  className="flex-1 ml-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}