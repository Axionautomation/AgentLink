import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Check } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm({ jobId, clientSecret }: { jobId: string; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?jobId=${jobId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      // Payment confirmed with Stripe - now confirm with backend
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/jobs/${jobId}/confirm-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to confirm payment');
        }

        setPaymentSuccess(true);
        toast({
          title: "Payment Successful!",
          description: "Your payment is held in escrow. The agent has been notified.",
        });

        setTimeout(() => {
          setLocation(`/jobs/${jobId}`);
        }, 1500);
      } catch (err) {
        toast({
          title: "Error",
          description: "Payment processed but confirmation failed. Please contact support.",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    }
  };

  if (paymentSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-card-foreground mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground">Redirecting to your job...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-lg"
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay Now
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your payment is secured by Stripe. Link by Stripe allows you to save your payment details for faster checkout.
      </p>
    </form>
  );
}

export default function Checkout() {
  const [match, params] = useRoute("/checkout/:jobId");
  const jobId = params?.jobId || "";
  const { toast } = useToast();
  const [stripeReady, setStripeReady] = useState(false);

  const { data: job, isLoading: jobLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load job");
      return res.json();
    },
    enabled: !!jobId,
  });

  // Fetch payment intent client secret
  const { data: paymentData, isLoading: paymentLoading } = useQuery<{ clientSecret: string }>({
    queryKey: [`/api/jobs/${jobId}/payment-intent`],
    enabled: !!jobId && !!job?.paymentIntentId,
  });

  useEffect(() => {
    stripePromise.then(() => setStripeReady(true));
  }, []);

  if (!match) {
    return null;
  }

  if (jobLoading || paymentLoading || !stripeReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job || !paymentData?.clientSecret) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">Payment Not Available</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load payment information. The job may not be claimed yet.
          </p>
          <Link href={`/jobs/${jobId}`}>
            <Button className="rounded-lg">Back to Job</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const options = {
    clientSecret: paymentData.clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#f97316',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="sm" className="rounded-lg" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Job
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-card-foreground">Secure Checkout</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">Payment Information</h2>
                  <p className="text-sm text-muted-foreground">Secured by Stripe</p>
                </div>
              </div>

              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm jobId={jobId} clientSecret={paymentData.clientSecret} />
              </Elements>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Order Summary</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Property Type</span>
                  <span className="text-card-foreground capitalize">{job.propertyType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-card-foreground">{job.duration} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Agent Payout</span>
                  <span className="text-card-foreground">${job.payoutAmount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee (20%)</span>
                  <span className="text-card-foreground">${job.platformFee}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-semibold text-card-foreground">Total Due</span>
                <span className="text-2xl font-bold text-primary">${job.fee}</span>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-card-foreground">Escrow Protection:</strong> Your ${job.fee} payment is held securely until the job is completed. The agent receives ${job.payoutAmount} (80%) after successful completion.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
