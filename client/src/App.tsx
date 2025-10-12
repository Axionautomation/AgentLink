import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CreateJob from "@/pages/CreateJob";
import JobDetail from "@/pages/JobDetail";
import Messages from "@/pages/Messages";
import MessagesList from "@/pages/MessagesList";
import Review from "@/pages/Review";
import Profile from "@/pages/Profile";
import MyJobs from "@/pages/MyJobs";
import Wallet from "@/pages/Wallet";
import AdminLicenses from "@/pages/AdminLicenses";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/create-job" component={CreateJob} />
          <Route path="/checkout/:jobId" component={Checkout} />
          <Route path="/payment-success" component={PaymentSuccess} />
          <Route path="/jobs/:id" component={JobDetail} />
          <Route path="/jobs/:jobId/review" component={Review} />
          <Route path="/messages" component={MessagesList} />
          <Route path="/messages/:jobId" component={Messages} />
          <Route path="/profile" component={Profile} />
          <Route path="/my-jobs" component={MyJobs} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/admin/licenses" component={AdminLicenses} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
