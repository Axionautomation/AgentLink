import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Star, Briefcase, MapPin, Mail, Phone, LogOut, Shield, Award, Upload } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Profile() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState("");

  const updateLicenseMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/user/license", {
        licenseNumber,
        licenseState,
        licenseDocumentUrl,
      });
    },
    onSuccess: () => {
      toast({
        title: "License Submitted",
        description: "Your license has been submitted for verification.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLicenseNumber("");
      setLicenseState("");
      setLicenseDocumentUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit license",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const completionRate = user?.totalJobs ? ((user.completedJobs || 0) / user.totalJobs * 100).toFixed(0) : '0';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
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
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.firstName || 'User'}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl">
                  {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">
                  {user?.firstName} {user?.lastName}
                </h2>
                {user?.brokerage && (
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Briefcase className="h-4 w-4" />
                    {user.brokerage}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-6">
                {user?.rating && parseFloat(user.rating) > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-primary text-primary" />
                    <span className="font-semibold text-card-foreground">
                      {parseFloat(user.rating).toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">rating</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-card-foreground">
                    {user?.completedJobs || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">jobs completed</span>
                </div>

                {user?.licenseVerified && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-card-foreground">Contact Information</h3>
          
          <div className="space-y-3">
            {user?.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-card-foreground">{user.email}</span>
              </div>
            )}

            {user?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-card-foreground">{user.phone}</span>
              </div>
            )}
          </div>
        </Card>

        {/* License Info */}
        {user?.licenseNumber ? (
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">License Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">License Number</p>
                  <p className="font-medium text-card-foreground">{user.licenseNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium text-card-foreground">{user.licenseState}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Shield className={`h-5 w-5 ${user.licenseVerified ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className="text-sm text-card-foreground">Verification Status</span>
                </div>
                <Badge className={
                  user.licenseVerified 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full'
                }>
                  {user.licenseVerified ? 'Verified' : 'Pending Verification'}
                </Badge>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-card-foreground">License Verification</h3>
              <Badge variant="outline" className="rounded-full">
                Required
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Submit your real estate license for verification to start accepting jobs
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Enter your license number"
                  className="rounded-lg"
                  data-testid="input-license-number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseState">State</Label>
                <Select value={licenseState} onValueChange={setLicenseState}>
                  <SelectTrigger className="rounded-lg" data-testid="select-license-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CA">California</SelectItem>
                    <SelectItem value="TX">Texas</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="NY">New York</SelectItem>
                    <SelectItem value="IL">Illinois</SelectItem>
                    <SelectItem value="PA">Pennsylvania</SelectItem>
                    <SelectItem value="OH">Ohio</SelectItem>
                    <SelectItem value="GA">Georgia</SelectItem>
                    <SelectItem value="NC">North Carolina</SelectItem>
                    <SelectItem value="MI">Michigan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseDocumentUrl">License Document URL</Label>
                <Input
                  id="licenseDocumentUrl"
                  value={licenseDocumentUrl}
                  onChange={(e) => setLicenseDocumentUrl(e.target.value)}
                  placeholder="https://example.com/license.pdf"
                  className="rounded-lg"
                  data-testid="input-license-document-url"
                />
                <p className="text-xs text-muted-foreground">
                  Upload your license to a service like Imgur or Google Drive and paste the link
                </p>
              </div>

              <Button 
                onClick={() => updateLicenseMutation.mutate()}
                disabled={!licenseNumber || !licenseState || !licenseDocumentUrl || updateLicenseMutation.isPending}
                className="w-full rounded-lg"
                data-testid="button-submit-license"
              >
                <Upload className="h-4 w-4 mr-2" />
                {updateLicenseMutation.isPending ? "Submitting..." : "Submit for Verification"}
              </Button>
            </div>
          </Card>
        )}

        {/* Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold text-card-foreground">{user?.totalJobs || 0}</p>
              <p className="text-sm text-muted-foreground">Total Jobs</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-card-foreground">{user?.completedJobs || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-card-foreground">{completionRate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
        </Card>

        {/* Bio */}
        {user?.bio && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-3">About</h3>
            <p className="text-card-foreground leading-relaxed">{user.bio}</p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={logout}
            className="flex-1 rounded-lg"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
