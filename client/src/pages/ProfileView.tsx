import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Briefcase, Shield, Award, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  age?: number;
  brokerage?: string;
  bio?: string;
  licenseVerified?: boolean;
  rating?: string;
  totalJobs?: number;
  completedJobs?: number;
}

export default function ProfileView() {
  const params = useParams();
  const userId = params.userId;
  const { toast } = useToast();

  const { data: userProfile, isLoading, error } = useQuery<UserProfile>({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      const token = localStorage.getItem('agentlink_auth_token');
      const res = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load user profile");
      return res.json();
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-lg">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-foreground">Profile</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-card-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground">This profile doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const completionRate = userProfile.totalJobs
    ? ((userProfile.completedJobs || 0) / userProfile.totalJobs * 100).toFixed(0)
    : '0';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              {userProfile.profileImageUrl ? (
                <img
                  src={userProfile.profileImageUrl}
                  alt={userProfile.firstName || 'User'}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl">
                  {userProfile.firstName?.[0] || userProfile.email?.[0] || 'U'}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">
                  {userProfile.firstName} {userProfile.lastName}
                </h2>
                {userProfile.age && (
                  <p className="text-muted-foreground mt-1">
                    Age: {userProfile.age}
                  </p>
                )}
                {userProfile.brokerage && (
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Briefcase className="h-4 w-4" />
                    {userProfile.brokerage}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                {userProfile.rating && parseFloat(userProfile.rating) > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-primary text-primary" />
                    <span className="font-semibold text-card-foreground">
                      {parseFloat(userProfile.rating).toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">rating</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-card-foreground">
                    {userProfile.completedJobs || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">jobs completed</span>
                </div>

                {userProfile.licenseVerified && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Bio */}
        {userProfile.bio && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-3">About</h3>
            <p className="text-card-foreground leading-relaxed whitespace-pre-wrap">{userProfile.bio}</p>
          </Card>
        )}

        {/* Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Statistics</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold text-card-foreground">{userProfile.totalJobs || 0}</p>
              <p className="text-sm text-muted-foreground">Total Jobs</p>
            </div>

            <div>
              <p className="text-2xl font-bold text-card-foreground">{userProfile.completedJobs || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>

            <div>
              <p className="text-2xl font-bold text-card-foreground">{completionRate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
