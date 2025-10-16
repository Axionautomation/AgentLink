import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useGeolocation, isWithinRadius } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, MapPin, Clock, DollarSign, Home, Building2, CheckCircle2, MapPinned, MessageSquare, ExternalLink, Info, Phone, User as UserIcon, Download, File, Image as ImageIcon } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import type { Job, User } from "@shared/schema";

interface JobWithUsers extends Job {
  poster?: User;
  claimer?: User;
}

export default function JobDetail() {
  const { id } = useParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { latitude, longitude, error: geoError, refresh: refreshLocation } = useGeolocation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [canCheckIn, setCanCheckIn] = useState(false);

  const { data: job, isLoading } = useQuery<JobWithUsers>({
    queryKey: [`/api/jobs/${id}`],
    enabled: !!id,
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

  // Check if user is within range for GPS check-in
  useEffect(() => {
    if (job && latitude && longitude && job.propertyLat && job.propertyLng) {
      const within = isWithinRadius(
        latitude,
        longitude,
        parseFloat(job.propertyLat),
        parseFloat(job.propertyLng),
        200
      );
      setCanCheckIn(within);
    }
  }, [job, latitude, longitude]);

  const claimJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/jobs/${id}/claim`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Claimed!",
        description: "The job poster will be notified to complete payment.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setLocation(`/jobs/${id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to claim job",
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!latitude || !longitude) {
        throw new Error("Location not available");
      }
      const response = await apiRequest("POST", `/api/jobs/${id}/check-in`, {
        latitude,
        longitude,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Checked In!",
        description: "Your attendance has been verified via GPS.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!latitude || !longitude) {
        throw new Error("Location not available");
      }
      const response = await apiRequest("POST", `/api/jobs/${id}/check-out`, {
        latitude,
        longitude,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Checked Out!",
        description: "Job completion recorded. Awaiting payment release.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to check out",
        variant: "destructive",
      });
    },
  });

  const completeJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/jobs/${id}/complete`, {});
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Job Completed!",
        description: "Payment has been released to the agent.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
      setLocation(`/jobs/${id}/review`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to complete job",
        variant: "destructive",
      });
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/jobs/${id}/cancel`, {});
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Job Cancelled",
        description: "The job has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unclaimJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/jobs/${id}/unclaim`, {});
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Job Unclaimed",
        description: "You have successfully opted out of this job.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Unclaim Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-card-foreground">Job not found</h2>
          <Link href="/">
            <Button className="mt-4 rounded-lg">Back to Marketplace</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isJobPoster = user?.id === job.posterId;
  const isJobClaimer = user?.id === job.claimerId;
  const canClaim = job.status === 'open' && !isJobPoster;
  const needsPayment = isJobPoster && job.status === 'claimed' && !job.escrowHeld && job.paymentIntentId;
  const canCheckInNow = isJobClaimer && !job.claimerCheckedIn && canCheckIn;
  const canCheckOutNow = isJobClaimer && job.claimerCheckedIn && !job.claimerCheckedOut && canCheckIn;
  const canComplete = isJobPoster && job.claimerCheckedOut && !job.paymentReleased;
  const canCancel = isJobPoster && (job.status === 'open' || job.status === 'claimed');
  const canUnclaim = isJobClaimer && job.status === 'claimed';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Job Details</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge className={`
            rounded-full px-4 py-1 text-sm font-medium
            ${job.status === 'open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
            ${job.status === 'claimed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
            ${job.status === 'in_progress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : ''}
            ${job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
          `} data-testid="badge-status">
            {job.status.replace('_', ' ').toUpperCase()}
          </Badge>
          
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold font-mono text-primary">
              ${job.payoutAmount ? parseFloat(job.payoutAmount).toFixed(2) : '0.00'}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Platform has a 20% fee on all jobs</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Property Info */}
        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            {job.propertyType === 'showing' ? (
              <Home className="h-6 w-6 text-primary mt-0.5" />
            ) : job.propertyType === 'open_house' ? (
              <Building2 className="h-6 w-6 text-primary mt-0.5" />
            ) : (
              <Home className="h-6 w-6 text-primary mt-0.5" />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-card-foreground">{job.propertyAddress}</h2>
              <p className="text-sm text-muted-foreground capitalize mt-1">
                {job.propertyType === 'other' && job.propertyTypeOther
                  ? job.propertyTypeOther
                  : job.propertyType.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Schedule</p>
                <p className="font-medium text-card-foreground">
                  {new Date(job.scheduledDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-card-foreground">{job.scheduledTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Payout</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">Platform has a 20% fee on all jobs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-medium font-mono text-card-foreground">${job.payoutAmount ? parseFloat(job.payoutAmount).toFixed(2) : '0.00'}</p>
              </div>
            </div>
          </div>

          {job.description && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Description</p>
              <p className="text-card-foreground">{job.description}</p>
            </div>
          )}

          {job.mlsListingUrl && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">MLS Listing</p>
              <a
                href={job.mlsListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                View Property Listing
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {(isJobClaimer || isJobPoster) && job.specialInstructions && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Special Instructions</p>
              <p className="text-card-foreground">{job.specialInstructions}</p>
            </div>
          )}

          {isJobClaimer && job.individualTips && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-semibold text-card-foreground">🔒 Individual Tips (Private)</p>
                <div className="flex-1 border-t border-border"></div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-3">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-2">
                  🔐 <strong>Secure Information:</strong> This information is private and only visible to you as the assigned agent.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">{job.individualTips}</pre>
              </div>
            </div>
          )}

          {job.attachmentUrls && Array.isArray(job.attachmentUrls) && job.attachmentUrls.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Attachments</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.attachmentUrls.map((file: any, index: number) => (
                  <a
                    key={index}
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    {file.type?.startsWith('image/') ? (
                      <ImageIcon className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <File className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Download'}
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Poster Info - Visible after job is claimed or to poster */}
        {job.poster && (job.status !== 'open' || isJobPoster) && (
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">
              Posted By
            </h3>
            <div className="flex items-start gap-4">
              {job.poster.profileImageUrl ? (
                <img
                  src={job.poster.profileImageUrl}
                  alt={job.poster.firstName || 'Agent'}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {job.poster.firstName?.[0] || 'A'}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-card-foreground">
                    {job.poster.firstName} {job.poster.lastName}
                  </p>
                </div>
                {/* Only show phone after job is claimed */}
                {job.poster.phone && job.status !== 'open' && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${job.poster.phone}`} className="text-sm text-primary hover:underline">
                      {job.poster.phone}
                    </a>
                  </div>
                )}
                {job.poster.brokerage && (
                  <p className="text-sm text-muted-foreground mt-1">{job.poster.brokerage}</p>
                )}
                {job.poster.rating && parseFloat(job.poster.rating) > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">⭐ {parseFloat(job.poster.rating).toFixed(1)} rating</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Agent Info */}
        {job.claimer && (
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">
              {isJobClaimer ? "Job Posted By" : "Covering Agent"}
            </h3>
            <div className="flex items-center gap-4">
              {(isJobClaimer ? job.poster : job.claimer)?.profileImageUrl ? (
                <img
                  src={(isJobClaimer ? job.poster : job.claimer)!.profileImageUrl!}
                  alt={(isJobClaimer ? job.poster : job.claimer)!.firstName || 'Agent'}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {(isJobClaimer ? job.poster : job.claimer)?.firstName?.[0] || 'A'}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-card-foreground">
                    {(isJobClaimer ? job.poster : job.claimer)?.firstName} {(isJobClaimer ? job.poster : job.claimer)?.lastName}
                  </p>
                </div>
                {(isJobClaimer ? job.poster : job.claimer)?.phone && (
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${(isJobClaimer ? job.poster : job.claimer)?.phone}`} className="text-sm text-primary hover:underline">
                      {(isJobClaimer ? job.poster : job.claimer)?.phone}
                    </a>
                  </div>
                )}
                {(isJobClaimer ? job.poster : job.claimer)?.brokerage && (
                  <p className="text-sm text-muted-foreground">{(isJobClaimer ? job.poster : job.claimer)?.brokerage}</p>
                )}
                {(isJobClaimer ? job.poster : job.claimer)?.rating && parseFloat((isJobClaimer ? job.poster : job.claimer)!.rating!) > 0 && (
                  <p className="text-sm text-muted-foreground">⭐ {parseFloat((isJobClaimer ? job.poster : job.claimer)!.rating!).toFixed(1)} rating</p>
                )}
              </div>
              <Link href={`/messages/${job.id}`}>
                <Button variant="outline" size="sm" className="rounded-lg" data-testid="button-message">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* GPS Check-in Section */}
        {(isJobClaimer || isJobPoster) && job.status !== 'open' && (
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-card-foreground">GPS Verification</h3>
            
            {geoError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">Location Error: {geoError}</p>
                <Button onClick={refreshLocation} variant="outline" size="sm" className="mt-2 rounded-lg">
                  Retry Location
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {isJobClaimer && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {job.claimerCheckedIn ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <MapPinned className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-sm text-card-foreground">Check-in</span>
                    </div>
                    {job.claimerCheckedIn ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                        Verified
                      </Badge>
                    ) : canCheckInNow ? (
                      <Button
                        onClick={() => checkInMutation.mutate()}
                        disabled={checkInMutation.isPending}
                        size="sm"
                        className="rounded-lg"
                        data-testid="button-check-in"
                      >
                        {checkInMutation.isPending ? "Checking In..." : "Check In"}
                      </Button>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground rounded-full">
                        {latitude && longitude ? "Not in range (200ft)" : "Waiting for location"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {job.claimerCheckedOut ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <MapPinned className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-sm text-card-foreground">Check-out</span>
                    </div>
                    {job.claimerCheckedOut ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                        Verified
                      </Badge>
                    ) : canCheckOutNow ? (
                      <Button
                        onClick={() => checkOutMutation.mutate()}
                        disabled={checkOutMutation.isPending}
                        size="sm"
                        className="rounded-lg"
                        data-testid="button-check-out"
                      >
                        {checkOutMutation.isPending ? "Checking Out..." : "Check Out"}
                      </Button>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground rounded-full">
                        {!job.claimerCheckedIn ? "Check in first" : "Not in range (200ft)"}
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {isJobPoster && job.claimerCheckedOut && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-400">
                    ✓ Agent has completed check-in and check-out. Ready to release payment.
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Payment Required Alert for Poster */}
        {needsPayment && (
          <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Payment Required
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                  This job has been claimed. Please complete payment to confirm the booking and notify the agent.
                </p>
                <Button
                  className="rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={async () => {
                    try {
                      const response = await apiRequest("GET", `/api/jobs/${job.id}/checkout-url`, undefined);
                      const data = await response.json();
                      if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      }
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to start checkout",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay ${parseFloat(job.fee).toFixed(2)} Now
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
          {canClaim && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1 rounded-lg" data-testid="button-claim">
                  Claim Job
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Claim this job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    By claiming this job, you commit to attending the scheduled showing/open house.
                    The job poster will be notified and required to pay ${parseFloat(job.fee).toFixed(2)}.
                    Payment will be held in escrow and released to you after completion.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => claimJobMutation.mutate()}
                    disabled={claimJobMutation.isPending}
                    className="rounded-lg"
                  >
                    {claimJobMutation.isPending ? "Claiming..." : "Confirm Claim"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canComplete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1 rounded-lg" data-testid="button-complete">
                  Complete & Release Payment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete job and release payment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will release ${job.payoutAmount ? parseFloat(job.payoutAmount).toFixed(2) : '0.00'} 
                    to the covering agent and mark the job as completed. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => completeJobMutation.mutate()}
                    disabled={completeJobMutation.isPending}
                    className="rounded-lg"
                  >
                    {completeJobMutation.isPending ? "Processing..." : "Confirm & Release"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          </div>

          {/* Cancel/Unclaim buttons */}
          <div className="flex gap-4">
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1 rounded-lg" data-testid="button-cancel">
                    Cancel Job
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this job?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently cancel the job posting.
                      {job.status === 'claimed' && ' Any pending payments will be cancelled.'}
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-lg">Keep Job</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelJobMutation.mutate()}
                      disabled={cancelJobMutation.isPending}
                      className="rounded-lg bg-destructive hover:bg-destructive/90"
                    >
                      {cancelJobMutation.isPending ? "Cancelling..." : "Cancel Job"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canUnclaim && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex-1 rounded-lg" data-testid="button-unclaim">
                    Opt Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Opt out of this job?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your claim on this job and make it available for other agents.
                      Any pending payments will be cancelled. You can claim it again if it's still available.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-lg">Stay Claimed</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => unclaimJobMutation.mutate()}
                      disabled={unclaimJobMutation.isPending}
                      className="rounded-lg"
                    >
                      {unclaimJobMutation.isPending ? "Processing..." : "Opt Out"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
