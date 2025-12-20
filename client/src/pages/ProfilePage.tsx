import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Loader2, Eye, EyeOff } from "lucide-react";

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("New passwords do not match");
      }

      if (data.newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters long");
      }

      if (data.newPassword === data.currentPassword) {
        throw new Error("New password must be different from current password");
      }

      const res = await apiRequest("PATCH", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to change password");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });

      // Clear form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Hide all passwords
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change password",
        description:
          error.message || "An error occurred while changing your password.",
        variant: "destructive",
      });
    },
  });

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

  const handlePasswordChange =
    (field: keyof PasswordChangeData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate password
    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Password Validation Error",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

    // Check password confirmation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }
    passwordChangeMutation.mutate(passwordData);
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div
      className="container mx-auto px-4 max-w-4xl"
      data-testid="profile-page"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white"
            data-testid="page-title"
          >
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account information and security settings.
          </p>
        </div>

        {/* User Information Card */}
        <Card data-testid="user-info-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Account Information</span>
            </CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username: </Label>
                <span className="font-medium" data-testid="current-username">
                  {user.username}
                </span>
              </div>
              <div className="space-y-2">
                <Label>Account Status</Label>
                <Badge
                  variant="default"
                  className="w-fit"
                  data-testid="status-badge"
                >
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Password Change Card */}
        <Card data-testid="password-change-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Change Password</span>
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handlePasswordSubmit}
              className="space-y-4"
              data-testid="password-change-form"
            >
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange("currentPassword")}
                    placeholder="Current password"
                    required
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                    onClick={() => togglePasswordVisibility("current")}
                    data-testid="toggle-current-password"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange("newPassword")}
                    placeholder="Min 9 chars: 2+ letters, 2+ digits, 2+ special"
                    minLength={6}
                    required
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                    onClick={() => togglePasswordVisibility("new")}
                    data-testid="toggle-new-password"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange("confirmPassword")}
                    placeholder="Min 9 chars: 2+ letters, 2+ digits, 2+ special"
                    minLength={6}
                    required
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                    onClick={() => togglePasswordVisibility("confirm")}
                    data-testid="toggle-confirm-password"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={passwordChangeMutation.isPending}
                  data-testid="button-change-password"
                >
                  {passwordChangeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
