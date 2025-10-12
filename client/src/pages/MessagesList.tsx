import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Job, User } from "@shared/schema";

interface JobWithUsers extends Job {
  poster?: User;
  claimer?: User;
}

export default function MessagesList() {
  const { user } = useAuth();

  // Get all jobs where user is involved (poster or claimer)
  const { data: postedJobs = [], isLoading: loadingPosted } = useQuery<JobWithUsers[]>({
    queryKey: ["/api/my-jobs/posted"],
  });

  const { data: claimedJobs = [], isLoading: loadingClaimed } = useQuery<JobWithUsers[]>({
    queryKey: ["/api/my-jobs/claimed"],
  });

  const isLoading = loadingPosted || loadingClaimed;

  // Combine and filter jobs that have claimers (active conversations)
  const conversations = [
    ...postedJobs.filter(job => job.claimerId),
    ...claimedJobs
  ].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt!).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt!).getTime();
    return dateB - dateA;
  });

  if (isLoading) {
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
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-lg">
              ← Dashboard
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {conversations.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground mb-2">No conversations yet</h2>
            <p className="text-muted-foreground mb-6">
              When you post or claim jobs, you'll be able to message with other agents here.
            </p>
            <Link href="/">
              <Button className="rounded-lg">Browse Jobs</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((job) => {
              const isJobPoster = user?.id === job.posterId;
              const otherUser = isJobPoster ? job.claimer : job.poster;

              return (
                <Link key={job.id} href={`/messages/${job.id}`}>
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {otherUser?.profileImageUrl ? (
                        <img
                          src={otherUser.profileImageUrl}
                          alt={otherUser.firstName || 'User'}
                          className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                          {otherUser?.firstName?.[0] || otherUser?.email?.[0] || 'U'}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-card-foreground truncate">
                            {otherUser?.firstName} {otherUser?.lastName}
                          </h3>
                          <Badge className={`
                            ml-2 flex-shrink-0 rounded-full
                            ${job.status === 'open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                            ${job.status === 'claimed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                            ${job.status === 'in_progress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                            ${job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                          `}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-1">
                          {job.propertyAddress}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(job.scheduledDate).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="font-mono">${parseFloat(job.fee).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
