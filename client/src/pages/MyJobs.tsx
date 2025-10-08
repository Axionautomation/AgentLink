import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, DollarSign, Home, Building2, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Job } from "@shared/schema";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function MyJobs() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: myPostedJobs = [], isLoading: loadingPosted } = useQuery<Job[]>({
    queryKey: ["/api/my-jobs/posted"],
  });

  const { data: myClaimedJobs = [], isLoading: loadingClaimed } = useQuery<Job[]>({
    queryKey: ["/api/my-jobs/claimed"],
  });

  const getStatusBadge = (status: string) => {
    const classes = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      claimed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }[status] || '';

    return (
      <Badge className={`${classes} rounded-full`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const JobCard = ({ job, type }: { job: Job; type: 'posted' | 'claimed' }) => (
    <Card 
      className="p-4 space-y-3 hover-elevate transition-all duration-200 cursor-pointer"
      onClick={() => setLocation(`/jobs/${job.id}`)}
      data-testid={`card-${type}-job-${job.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          {job.propertyType === 'showing' ? (
            <Home className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          ) : (
            <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-card-foreground truncate">
              {job.propertyAddress}
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              {job.propertyType.replace('_', ' ')}
            </p>
          </div>
        </div>
        {getStatusBadge(job.status)}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <span className="font-mono">${parseFloat(job.fee).toFixed(0)}</span>
        </div>
      </div>

      <Button 
        className="w-full rounded-lg" 
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          setLocation(`/jobs/${job.id}`);
        }}
        data-testid={`button-view-${type}-job-${job.id}`}
      >
        View Details
      </Button>
    </Card>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">My Jobs</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="posted" className="space-y-6">
          <TabsList className="rounded-lg">
            <TabsTrigger value="posted" className="rounded-md" data-testid="tab-posted">
              Posted by Me ({myPostedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="claimed" className="rounded-md" data-testid="tab-claimed">
              Claimed by Me ({myClaimedJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posted" className="space-y-4">
            {loadingPosted ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  </Card>
                ))}
              </div>
            ) : myPostedJobs.length === 0 ? (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-card-foreground">No jobs posted yet</h3>
                  <p className="text-muted-foreground">
                    Post your first job to find coverage for your showings and open houses
                  </p>
                  <Link href="/create-job">
                    <Button className="mt-4 rounded-lg" data-testid="button-post-first-job">
                      Post a Job
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myPostedJobs.map((job) => (
                  <JobCard key={job.id} job={job} type="posted" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="claimed" className="space-y-4">
            {loadingClaimed ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  </Card>
                ))}
              </div>
            ) : myClaimedJobs.length === 0 ? (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-card-foreground">No claimed jobs yet</h3>
                  <p className="text-muted-foreground">
                    Browse the marketplace to find jobs you can claim and start earning
                  </p>
                  <Link href="/">
                    <Button className="mt-4 rounded-lg" data-testid="button-browse-jobs">
                      Browse Jobs
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myClaimedJobs.map((job) => (
                  <JobCard key={job.id} job={job} type="claimed" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
