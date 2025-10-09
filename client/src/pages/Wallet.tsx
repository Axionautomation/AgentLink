import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, DollarSign, TrendingUp, Clock, ArrowUpRight, ArrowDownLeft, Landmark, Wallet as WalletIcon } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";
import { loadConnectAndInitialize } from "@stripe/connect-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Wallet() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load transactions");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await apiRequest("POST", "/api/create-payout", { amount });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal Successful!",
        description: "Funds have been sent to your bank account.",
      });
      setWithdrawAmount("");
      setShowWithdrawForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to withdraw",
        variant: "destructive",
      });
      return;
    }
    withdrawMutation.mutate(withdrawAmount);
  };

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

  // Calculate balances from transactions (escrow releases minus payouts)
  const escrowReleased = transactions
    .filter(t => t.type === 'escrow_release' && t.status === 'completed' && t.toUserId === user?.id)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const completedPayouts = transactions
    .filter(t => t.type === 'payout' && t.status === 'completed' && t.userId === user?.id)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const availableBalance = escrowReleased - completedPayouts;

  const pendingBalance = transactions
    .filter(t => (t.status === 'pending' || t.status === 'processing') && t.toUserId === user?.id)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  // Calculate earnings by period
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayEarnings = transactions
    .filter(t => t.toUserId === user?.id && new Date(t.createdAt!) >= todayStart)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const weekEarnings = transactions
    .filter(t => t.toUserId === user?.id && new Date(t.createdAt!) >= weekStart)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const monthEarnings = transactions
    .filter(t => t.toUserId === user?.id && new Date(t.createdAt!) >= monthStart)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const allTimeEarnings = transactions
    .filter(t => t.toUserId === user?.id)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

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
            <p className="text-4xl font-bold font-mono text-card-foreground" data-testid="text-available-balance">
              ${availableBalance.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Ready to withdraw</p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-4xl font-bold font-mono text-card-foreground" data-testid="text-pending-balance">
              ${pendingBalance.toFixed(2)}
            </p>
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
              <p className="text-2xl font-bold font-mono text-card-foreground" data-testid="text-today-earnings">
                ${todayEarnings.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">This Week</p>
              <p className="text-2xl font-bold font-mono text-card-foreground" data-testid="text-week-earnings">
                ${weekEarnings.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-bold font-mono text-card-foreground" data-testid="text-month-earnings">
                ${monthEarnings.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">All Time</p>
              <p className="text-2xl font-bold font-mono text-card-foreground" data-testid="text-alltime-earnings">
                ${allTimeEarnings.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Withdrawal Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Withdrawals
            </h3>
            {user?.bankName && (
              <Badge variant="outline" className="gap-1">
                <Landmark className="h-3 w-3" />
                {user.bankName} ••••{user.bankAccountLast4}
              </Badge>
            )}
          </div>

          {!user?.bankName ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Landmark className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                Link your bank account to withdraw funds instantly with Stripe Financial Connections
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Note: For MVP, bank linking is simulated. In production, use Stripe Financial Connections.
              </p>
            </div>
          ) : showWithdrawForm ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 block">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="pl-9"
                    data-testid="input-withdraw-amount"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Available: ${availableBalance.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawMutation.isPending}
                  className="rounded-lg flex-1"
                  data-testid="button-confirm-withdraw"
                >
                  {withdrawMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWithdrawForm(false);
                    setWithdrawAmount("");
                  }}
                  className="rounded-lg"
                  data-testid="button-cancel-withdraw"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowWithdrawForm(true)}
                disabled={availableBalance <= 0}
                className="rounded-lg flex-1"
                data-testid="button-withdraw"
              >
                <WalletIcon className="w-4 h-4 mr-2" />
                Withdraw Funds
              </Button>
            </div>
          )}
        </Card>

        {/* Transaction History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Transaction History</h3>
          
          {transactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">No transactions yet</h4>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your payment history will appear here once you complete jobs
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const isIncoming = transaction.toUserId === user?.id;
                const isOutgoing = transaction.fromUserId === user?.id;
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate transition-colors"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isIncoming ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                      }`}>
                        {isIncoming ? (
                          <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">
                          {isIncoming ? 'Payment received' : 'Payment sent'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">
                            {transaction.type === 'escrow' ? 'Escrow' : 
                             transaction.type === 'release' ? 'Payment release' : 
                             transaction.type === 'refund' ? 'Refund' : 
                             transaction.type === 'platform_fee' ? 'Platform fee' : 
                             'Payment'}
                          </p>
                          <Badge variant={
                            transaction.status === 'completed' ? 'default' : 
                            transaction.status === 'pending' ? 'secondary' : 
                            'outline'
                          } className="rounded-full text-xs">
                            {transaction.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(transaction.createdAt!), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold font-mono ${
                        isIncoming ? 'text-green-600 dark:text-green-400' : 'text-card-foreground'
                      }`}>
                        {isIncoming ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
