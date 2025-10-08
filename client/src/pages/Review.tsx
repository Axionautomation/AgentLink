import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Star, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { insertReviewSchema } from "@shared/schema";
import type { Job, User } from "@shared/schema";

interface JobWithUsers extends Job {
  poster?: User;
  claimer?: User;
}

export default function Review() {
  const { jobId } = useParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const { data: job } = useQuery<JobWithUsers>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: !!jobId,
  });

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

  const form = useForm({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      jobId: jobId || "",
      reviewerId: "",
      revieweeId: "",
      rating: 0,
      communication: false,
      professionalism: false,
      punctuality: false,
      comment: "",
    },
  });

  useEffect(() => {
    if (user?.id && job) {
      form.setValue("reviewerId", user.id);
      const revieweeId = user.id === job.posterId ? job.claimerId : job.posterId;
      if (revieweeId) {
        form.setValue("revieweeId", revieweeId);
      }
    }
  }, [user, job, form]);

  useEffect(() => {
    form.setValue("rating", rating);
  }, [rating, form]);

  const submitReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/review`, data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating",
        variant: "destructive",
      });
      return;
    }
    submitReviewMutation.mutate(data);
  };

  if (authLoading) {
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
            <Button className="mt-4 rounded-lg">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const reviewee = user?.id === job.posterId ? job.claimer : job.poster;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Leave a Review</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-6 space-y-6">
          {/* Reviewee Info */}
          <div className="flex items-center gap-4 pb-6 border-b border-border">
            {reviewee?.profileImageUrl ? (
              <img
                src={reviewee.profileImageUrl}
                alt={reviewee.firstName || 'User'}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xl">
                {reviewee?.firstName?.[0] || 'U'}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-card-foreground">
                {reviewee?.firstName} {reviewee?.lastName}
              </p>
              {reviewee?.brokerage && (
                <p className="text-sm text-muted-foreground">{reviewee.brokerage}</p>
              )}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Star Rating */}
              <div className="space-y-3">
                <FormLabel className="text-base">Rate your experience *</FormLabel>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                      data-testid={`star-${star}`}
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {rating === 5 && "Excellent!"}
                    {rating === 4 && "Very Good"}
                    {rating === 3 && "Good"}
                    {rating === 2 && "Fair"}
                    {rating === 1 && "Poor"}
                  </p>
                )}
              </div>

              {/* Quick Feedback */}
              <div className="space-y-3">
                <FormLabel className="text-base">Quick Feedback</FormLabel>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="communication"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="rounded-md"
                            data-testid="checkbox-communication"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Great Communication
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionalism"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="rounded-md"
                            data-testid="checkbox-professionalism"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Very Professional
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="punctuality"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="rounded-md"
                            data-testid="checkbox-punctuality"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Always Punctual
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Comment */}
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Additional Comments</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Share more details about your experience..."
                        className="rounded-lg resize-none"
                        rows={4}
                        data-testid="textarea-comment"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                  className="rounded-lg"
                  data-testid="button-skip"
                >
                  Skip Review
                </Button>
                <Button
                  type="submit"
                  disabled={submitReviewMutation.isPending || rating === 0}
                  className="flex-1 rounded-lg"
                  data-testid="button-submit"
                >
                  {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
