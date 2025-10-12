import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";
import { insertJobSchema, type InsertJob } from "@shared/schema";
import { z } from "zod";

const formSchema = insertJobSchema.extend({
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  duration: z.string().min(1, "Duration is required"),
  fee: z.string().min(1, "Fee is required"),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateJob() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      posterId: "",
      propertyAddress: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      propertyType: "showing",
      scheduledDate: "",
      scheduledTime: "",
      duration: "60",
      description: "",
      specialInstructions: "",
      fee: "",
      status: "open",
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

  useEffect(() => {
    if (user?.id) {
      form.setValue("posterId", user.id);
    }
  }, [user, form]);

  const createJobMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Convert date string to Date object
      const scheduledDate = new Date(data.scheduledDate);

      // Build full address
      const fullAddress = `${data.addressLine1}${data.addressLine2 ? ', ' + data.addressLine2 : ''}, ${data.city}, ${data.state} ${data.zipCode}`;

      // Geocode the address using OpenStreetMap Nominatim API
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      let propertyLat = null;
      let propertyLng = null;

      if (geocodeData && geocodeData.length > 0) {
        propertyLat = geocodeData[0].lat;
        propertyLng = geocodeData[0].lon;
      }

      // Convert string fee and duration to proper format
      const jobData = {
        ...data,
        propertyAddress: fullAddress,
        propertyLat,
        propertyLng,
        scheduledDate: scheduledDate.toISOString(),
        fee: parseFloat(data.fee).toFixed(2),
        duration: parseInt(data.duration),
        platformFee: (parseFloat(data.fee) * 0.2).toFixed(2),
        payoutAmount: (parseFloat(data.fee) * 0.8).toFixed(2),
      };

      const response = await apiRequest("POST", "/api/jobs", jobData);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Job Posted!",
        description: "Your job is now live on the marketplace. Payment will be required when someone claims it.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setLocation(`/jobs/${data.id}`);
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
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createJobMutation.mutate(data);
  };

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
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Post a Job</h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Property Address
                </h3>

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123 Main Street"
                          className="rounded-lg"
                          data-testid="input-address-line-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Apt, Suite, Unit, etc."
                          className="rounded-lg"
                          data-testid="input-address-line-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="City"
                            className="rounded-lg"
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="ST"
                            maxLength={2}
                            className="rounded-lg uppercase"
                            data-testid="input-state"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="12345"
                            className="rounded-lg font-mono"
                            data-testid="input-zip"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg" data-testid="select-job-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="showing">Showing</SelectItem>
                          <SelectItem value="open_house">Open House</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee (USD) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="50.00"
                          className="rounded-lg font-mono"
                          data-testid="input-fee"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Platform fee: 20% • You pay: ${field.value ? (parseFloat(field.value) || 0).toFixed(2) : '0.00'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="rounded-lg"
                          data-testid="input-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Window *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="2:00 PM - 4:00 PM"
                          className="rounded-lg"
                          data-testid="input-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min) *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg" data-testid="select-duration">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="180">3 hours</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional details about the job..."
                        className="rounded-lg resize-none"
                        rows={3}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Lockbox code, parking instructions, etc..."
                        className="rounded-lg resize-none"
                        rows={3}
                        data-testid="textarea-instructions"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Only visible to the agent who claims this job
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                  className="rounded-lg"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createJobMutation.isPending}
                  className="flex-1 rounded-lg"
                  data-testid="button-submit"
                >
                  {createJobMutation.isPending ? "Posting..." : "Post Job & Pay"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
