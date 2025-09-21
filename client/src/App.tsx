import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminFooter } from "@/components/AdminFooter";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Page imports
import { HomePage } from "@/pages/HomePage";
import { CreateUserPage } from "@/pages/CreateUserPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { CreateCampaignPage } from "@/pages/CreateCampaignPage";
import { EditCampaignPage } from "@/pages/EditCampaignPage";
import { QRCodeListPage } from "@/pages/QRCodeListPage";
import { CampaignDetailPage } from "@/pages/CampaignDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AdminHeader />
      <main className="container mx-auto px-4 py-8 flex-1">
        {children}
      </main>
      <AdminFooter />
    </div>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Redirect root to home if authenticated, otherwise to auth */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/home" /> : <Redirect to="/auth" />}
      </Route>
      
      {/* Authentication page - only show if not authenticated */}
      <Route path="/auth">
        {isAuthenticated ? <Redirect to="/home" /> : <Auth />}
      </Route>

      {/* Protected admin pages with AdminLayout */}
      <Route path="/home">
        <ProtectedRoute>
          <AdminLayout>
            <HomePage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/create-user">
        <ProtectedRoute>
          <AdminLayout>
            <CreateUserPage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/analytics">
        <ProtectedRoute>
          <AdminLayout>
            <AnalyticsPage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/create-campaign">
        <ProtectedRoute>
          <AdminLayout>
            <CreateCampaignPage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/qr">
        <ProtectedRoute>
          <AdminLayout>
            <QRCodeListPage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* Edit Campaign Page */}
      <Route path="/edit-campaign/:campaignId">
        {(params) => (
          <ProtectedRoute>
            <AdminLayout>
              <EditCampaignPage campaignId={params.campaignId} />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>

      {/* Campaign Detail Page */}
      <Route path="/qr/:campaignId">
        <ProtectedRoute>
          <AdminLayout>
            <CampaignDetailPage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* Profile Page */}
      <Route path="/profile">
        <ProtectedRoute>
          <AdminLayout>
            <ProfilePage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
