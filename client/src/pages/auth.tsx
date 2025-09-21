import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";
import { Mail, Phone, QrCode, Eye, EyeOff } from "lucide-react";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.username}!`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive"
      });
    }
  });


  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900 grid grid-cols-1 lg:grid-cols-2">
      {/* Left Half - Animated QR Code */}
      <div className="hidden lg:flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
        <div className="relative z-10 text-center">
          <div className="mb-8">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
            <h1 className="text-4xl font-bold text-foreground mb-2">QR Campaign Manager</h1>
            <p className="text-lg text-muted-foreground">Streamline your QR code campaigns with powerful analytics</p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
            {/* QR Code Section */}
            <div className="relative group flex justify-center shrink-0">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg group-hover:blur-xl transition-all duration-300 animate-pulse"></div>
              <div className="relative bg-background/80 backdrop-blur-sm rounded-lg p-6 border border-border/50">
                <QRCodeGenerator 
                  value="https://qr-campaign.demo" 
                  size={200} 
                  className="animate-in zoom-in-50 duration-1000 hover:scale-105 transition-transform cursor-pointer mx-auto"
                />
                <p className="mt-4 text-sm text-muted-foreground text-center">Sample QR Campaign</p>
              </div>
            </div>
            
            {/* Admin Welcome Message */}
            <div className="max-w-md">
              <div className="p-6 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-4">Welcome, Administrator</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Access your comprehensive QR campaign management dashboard. Create campaigns, track performance, manage users, and gain valuable insights into your QR code engagements.
                </p>
                <div className="mt-4 text-sm text-primary/80">
                  Secure • Powerful • Analytics-Driven
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Half - Login Form */}
      <div className="flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-auth">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">Admin Dashboard</CardTitle>
            <p className="text-muted-foreground">Sign in to access the admin panel</p>
          </CardHeader>
          <CardContent className="mt-6">
            {/* Sample Login Credentials */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                📋 Sample Login Credentials
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <div><strong>Username:</strong> Suraj Kumar</div>
                <div><strong>Password:</strong> Password@123</div>
              </div>
            </div>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          data-testid="input-login-username"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Enter your password" 
                            data-testid="input-login-password"
                            {...field} 
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
                <div className="text-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="link" 
                        className="text-sm text-muted-foreground"
                        data-testid="button-forgot-password"
                      >
                        Forgot password?
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid="dialog-forgot-password">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          Forgot Password?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-left space-y-3">
                          <p>
                            If you've forgotten your password, please contact an active administrator to reset it for you.
                          </p>
                          <div className="bg-muted p-4 rounded-md">
                            <h4 className="font-semibold mb-2">How to get help:</h4>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-start gap-2">
                                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <span>Contact your system administrator via email</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <span>Call your organization's IT support</span>
                              </li>
                            </ul>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Only active administrators can reset user passwords for security reasons.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogAction data-testid="button-close-forgot-password">
                          I understand
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
