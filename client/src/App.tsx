import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import CreateJob from "@/pages/CreateJob";
import JobDetail from "@/pages/JobDetail";
import Messages from "@/pages/Messages";
import Review from "@/pages/Review";
import Profile from "@/pages/Profile";
import MyJobs from "@/pages/MyJobs";
import Wallet from "@/pages/Wallet";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/create-job" component={CreateJob} />
          <Route path="/jobs/:id" component={JobDetail} />
          <Route path="/jobs/:jobId/review" component={Review} />
          <Route path="/messages/:jobId" component={Messages} />
          <Route path="/profile" component={Profile} />
          <Route path="/my-jobs" component={MyJobs} />
          <Route path="/wallet" component={Wallet} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
