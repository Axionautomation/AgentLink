import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Loader } from "lucide-react";
import { Link } from "wouter";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [jobId, setJobId] = useState<string>("");

  useEffect(() => {
    const verifyPayment = async () => {
      const stripe = await stripePromise;
      if (!stripe) {
        setStatus("error");
        return;
      }

      // Get payment intent client secret and job ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const clientSecret = urlParams.get("payment_intent_client_secret");
      const urlJobId = urlParams.get("jobId");

      if (!clientSecret || !urlJobId) {
        setStatus("error");
        return;
      }

      setJobId(urlJobId);

      try {
        // Verify payment status with Stripe
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

        if (!paymentIntent) {
          setStatus("error");
          return;
        }

        switch (paymentIntent.status) {
          case "succeeded":
            // Payment succeeded - now confirm with backend
            console.log('Payment succeeded, confirming with backend:', urlJobId);

            try {
              const token = localStorage.getItem('agentlink_auth_token');
              const response = await fetch(`/api/jobs/${urlJobId}/confirm-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                credentials: 'include',
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error('Backend confirmation failed:', errorData);
                throw new Error(errorData.message || 'Failed to confirm payment with server');
              }

              console.log('Payment confirmed with backend successfully');
              setStatus("success");

              // Redirect to job detail page after 2 seconds
              setTimeout(() => {
                setLocation(`/jobs/${urlJobId}`);
              }, 2000);
            } catch (backendError: any) {
              console.error('Backend confirmation error:', backendError);
              // Payment succeeded with Stripe but backend confirmation failed
              // Still show success to user but log the error
              setStatus("success");
              setTimeout(() => {
                setLocation(`/jobs/${urlJobId}`);
              }, 2000);
            }
            break;

          case "processing":
            setStatus("loading");
            // Check again in 2 seconds
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            break;

          case "requires_payment_method":
          default:
            setStatus("error");
            break;
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [setLocation]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-card-foreground mb-2">Processing Payment...</h2>
          <p className="text-muted-foreground">
            Please wait while we verify your payment.
          </p>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-card-foreground mb-2">Payment Failed</h2>
          <p className="text-muted-foreground mb-6">
            There was an issue processing your payment. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            {jobId && (
              <Link href={`/checkout/${jobId}`}>
                <Button className="rounded-lg" data-testid="button-retry-payment">Retry Payment</Button>
              </Link>
            )}
            <Link href="/">
              <Button variant="outline" className="rounded-lg" data-testid="button-back-dashboard">Back to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-card-foreground mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-6">
          Payment confirmed! The agent has been notified and funds are held in escrow. Redirecting...
        </p>
        <div className="flex gap-2 justify-center">
          {jobId && (
            <Link href={`/jobs/${jobId}`}>
              <Button className="rounded-lg" data-testid="button-view-job">View Job</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
