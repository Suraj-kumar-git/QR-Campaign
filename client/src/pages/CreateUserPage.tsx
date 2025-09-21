import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Loader2,
  Users,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Calendar,
  BarChart3,
  Activity,
  TrendingUp,
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { SafeUser } from "@shared/schema";

interface UserStats {
  totalCampaigns: number;
  totalScans: number;
  activeCampaigns: number;
  expiredCampaigns: number;
  createdAt: string;
}

export function CreateUserPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, logout } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return (await res.json()) as SafeUser[];
    },
  });

  // Fetch user stats when a user is selected
  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ["/api/users", selectedUser?.id, "stats"],
    queryFn: async () => {
      if (!selectedUser?.id) return null;
      const res = await apiRequest(
        "GET",
        `/api/users/${selectedUser.id}/stats`,
      );
      return (await res.json()) as UserStats;
    },
    enabled: !!selectedUser?.id,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created successfully",
        description: "The new user has been added to the system.",
      });
      setFormData({ username: "", password: "", confirmPassword: "" });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description:
          error.message || "An error occurred while creating the user.",
        variant: "destructive",
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/status`, {
        isActive,
      });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      // Check if user deactivated their own account
      if (data.selfDeactivated) {
        toast({
          title: "Account deactivated",
          description:
            data.message ||
            "Your account has been deactivated. You will be logged out.",
        });

        // Auto-logout after a short delay to show the message
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        toast({
          title: "User status updated",
          description: `User has been ${variables.isActive ? "activated" : "deactivated"} successfully.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      // Handle specific error for last active user
      if (error.message === "Cannot deactivate the last active user") {
        toast({
          title: "Cannot deactivate user",
          description: "There must be at least one active user in the system.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to update user status",
          description:
            error.message ||
            "An error occurred while updating the user status.",
          variant: "destructive",
        });
      }
    },
  });

  // Enhanced validation functions
  const validateUsername = (
    username: string,
  ): { isValid: boolean; message?: string } => {
    if (!username) {
      return { isValid: false, message: "Username is required." };
    }

    if (username.length < 10) {
      return {
        isValid: false,
        message: "Username must be at least 10 characters long.",
      };
    }

    const hasLetter = /[a-zA-Z]/.test(username);
    const hasDigit = /[0-9]/.test(username);
    const allowedSpecialChars = /[#$\-_.@]/;
    const hasAllowedSpecialChar = allowedSpecialChars.test(username);
    const hasOnlyAllowedChars = /^[a-zA-Z0-9#$\-_.@]+$/.test(username);

    if (!hasOnlyAllowedChars) {
      return {
        isValid: false,
        message:
          "Username can only contain letters, digits, and these special characters: # $ - _ . @",
      };
    }

    if (!hasLetter || !hasDigit || !hasAllowedSpecialChar) {
      return {
        isValid: false,
        message:
          "Username must contain at least one letter, one digit, and one special character from: # $ - _ . @",
      };
    }

    return { isValid: true };
  };

  const validatePassword = (
    password: string,
  ): { isValid: boolean; message?: string } => {
    if (!password) {
      return { isValid: false, message: "Password is required." };
    }

    if (password.length < 9) {
      return {
        isValid: false,
        message: "Password must be at least 9 characters long.",
      };
    }

    const digitMatches = password.match(/[0-9]/g);
    const letterMatches = password.match(/[a-zA-Z]/g);
    const specialMatches = password.match(/[!@#$%^&*(),.?":{}|<>]/g);

    if (!digitMatches || digitMatches.length < 2) {
      return {
        isValid: false,
        message: "Password must contain at least 2 digits.",
      };
    }

    if (!letterMatches || letterMatches.length < 2) {
      return {
        isValid: false,
        message: "Password must contain at least 2 letters.",
      };
    }

    if (!specialMatches || specialMatches.length < 2) {
      return {
        isValid: false,
        message: "Password must contain at least 2 special characters.",
      };
    }

    return { isValid: true };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) {
      toast({
        title: "Username Validation Error",
        description: usernameValidation.message,
        variant: "destructive",
      });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Password Validation Error",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate({
      username: formData.username,
      password: formData.password,
    });
  };

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleUserClick = (user: SafeUser) => {
    setSelectedUser(user);
    setIsUserDetailsOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6" data-testid="create-user-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-gray-900 dark:text-white"
            data-testid="page-title"
          >
            User Management
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mt-2"
            data-testid="page-description"
          >
            Create new users and manage existing user accounts.
          </p>
        </div>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="flex items-center space-x-2 w-full sm:w-auto"
              data-testid="button-create-user"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New User</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a secure user account with strong validation
                requirements.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              data-testid="create-user-form"
            >
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange("username")}
                  placeholder="Min 10 chars: letters+digits+special (#$-_.@)"
                  required
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange("password")}
                    placeholder="Min 9 chars: 2+ letters, 2+ digits, 2+ special"
                    required
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="toggle-password-visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    placeholder="Confirm password"
                    required
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="toggle-confirm-password-visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Existing Users</span>
          </CardTitle>
          <CardDescription>
            Click on a user to view details. Manage user status with the action
            buttons.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div
              className="flex items-center justify-center py-8"
              data-testid="users-loading"
            >
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div
              className="text-center py-8 text-gray-500 px-6"
              data-testid="no-users"
            >
              No users found. Create your first user using the button above.
            </div>
          ) : (
            <div className="divide-y" data-testid="users-list">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-3"
                  data-testid={`user-item-${user.id}`}
                >
                  <div
                    className="flex items-center space-x-3 cursor-pointer flex-1"
                    onClick={() => handleUserClick(user)}
                    data-testid={`user-details-trigger-${user.id}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium truncate text-black dark:text-white"
                        data-testid={`username-${user.id}`}
                      >
                        {user.username}
                      </p>
                      <p
                        className="text-sm text-gray-500 truncate"
                        data-testid={`user-id-${user.id}`}
                      >
                        ID: {user.id}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>

                  <div className="flex items-center space-x-3 sm:ml-4">
                    <Badge
                      variant={user.isActive ? "default" : "secondary"}
                      data-testid={`status-${user.id}`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>

                    {/* Confirmation Dialog for Status Toggle */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={user.isActive ? "destructive" : "default"}
                          size="sm"
                          disabled={updateUserStatusMutation.isPending}
                          data-testid={`button-toggle-${user.id}`}
                        >
                          {updateUserStatusMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.isActive ? (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {user.isActive ? "Deactivate" : "Activate"} User
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to{" "}
                            {user.isActive ? "deactivate" : "activate"} the user{" "}
                            <strong>{user.username}</strong>?
                            {user.isActive
                              ? " This will prevent them from accessing the system."
                              : " This will allow them to access the system."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              updateUserStatusMutation.mutate({
                                userId: user.id,
                                isActive: !user.isActive,
                              })
                            }
                            className={
                              user.isActive ? "bg-red-600 hover:bg-red-700" : ""
                            }
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>User Details</span>
            </DialogTitle>
            <DialogDescription>
              Detailed statistics and information for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedUser.username}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge
                    variant={selectedUser.isActive ? "default" : "secondary"}
                  >
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Account Created</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {userStats ? formatDate(userStats.createdAt) : "Loading..."}
                  </p>
                </div>
              </div>

              {/* User Statistics */}
              {userStatsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading statistics...</span>
                </div>
              ) : userStats ? (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-2xl font-bold text-white dark:text-black">
                            {userStats.totalCampaigns}
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Campaigns
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-2xl font-bold text-white dark:text-black">
                            {userStats.totalScans}
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Scans
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-yellow-600" />
                        <div>
                          <div className="text-2xl font-bold text-white dark:text-black">
                            {userStats.activeCampaigns}
                          </div>
                          <div className="text-sm text-gray-500">
                            Active Campaigns
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-red-600" />
                        <div>
                          <div className="text-2xl font-bold text-white dark:text-black">
                            {userStats.expiredCampaigns}
                          </div>
                          <div className="text-sm text-gray-500">
                            Expired Campaigns
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Unable to load user statistics.
                </div>
              )}

              {/* Engagement Insights */}
              {userStats && userStats.totalCampaigns > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold mb-2 flex items-center text-gray-900 dark:text-gray-100">
                    <TrendingUp className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                    Campaign Engagement
                  </h4>
                  <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                    <p>
                      <strong className="text-gray-900 dark:text-gray-100">
                        Average scans per campaign:
                      </strong>{" "}
                      <span className="text-gray-800 dark:text-gray-200">
                        {(
                          userStats.totalScans / userStats.totalCampaigns
                        ).toFixed(1)}
                      </span>
                    </p>
                    <p>
                      <strong className="text-gray-900 dark:text-gray-100">
                        Campaign success rate:
                      </strong>{" "}
                      <span className="text-gray-800 dark:text-gray-200">
                        {(
                          (userStats.activeCampaigns /
                            userStats.totalCampaigns) *
                          100
                        ).toFixed(1)}
                        % active
                      </span>
                    </p>
                    <p className="text-blue-800 dark:text-blue-200">
                      This user has generated{" "}
                      <strong className="text-blue-900 dark:text-blue-100">
                        {userStats.totalScans} total engagements
                      </strong>{" "}
                      across {userStats.totalCampaigns} campaigns.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
