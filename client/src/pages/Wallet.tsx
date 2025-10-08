import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, DollarSign, TrendingUp, Clock } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Wallet() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

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
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Wallet</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-medium">Available Balance</span>
            </div>
            <p className="text-4xl font-bold font-mono text-card-foreground">$0.00</p>
            <p className="text-sm text-muted-foreground">Ready to withdraw</p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-4xl font-bold font-mono text-card-foreground">$0.00</p>
            <p className="text-sm text-muted-foreground">In escrow or processing</p>
          </Card>
        </div>

        {/* Earnings Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Earnings Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Today</p>
              <p className="text-2xl font-bold font-mono text-card-foreground">$0.00</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">This Week</p>
              <p className="text-2xl font-bold font-mono text-card-foreground">$0.00</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-bold font-mono text-card-foreground">$0.00</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">All Time</p>
              <p className="text-2xl font-bold font-mono text-card-foreground">$0.00</p>
            </div>
          </div>
        </Card>

        {/* Transaction History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Transaction History</h3>
          
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-semibold text-card-foreground mb-2">No transactions yet</h4>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Your payment history will appear here once you complete jobs
            </p>
          </div>
        </Card>

        {/* Payout Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Payout Settings</h3>
          <p className="text-muted-foreground mb-4">
            Connect your bank account to receive payouts from completed jobs
          </p>
          <Button variant="outline" className="rounded-lg" data-testid="button-connect-bank">
            Connect Bank Account
          </Button>
        </Card>
      </div>
    </div>
  );
}
