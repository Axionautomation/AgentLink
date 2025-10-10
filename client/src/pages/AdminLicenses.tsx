import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, CheckCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function AdminLicenses() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: pendingUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/pending-licenses"],
    enabled: !!user?.isAdmin,
  });

  // Redirect non-admin users
  if (!authLoading && (!user || !user.isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-card-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            This page is restricted to administrators only.
          </p>
          <Link href="/">
            <Button className="rounded-lg">Return to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/approve-license/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-licenses"] });
    },
  });

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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">License Review Queue</h1>
              <p className="text-sm text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-card-foreground">Pending License Verifications</h2>
            <Badge variant="secondary" className="rounded-full">
              {pendingUsers.length} pending
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending license verifications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((pendingUser) => (
                <div
                  key={pendingUser.id}
                  className="border border-border rounded-lg p-4 hover-elevate transition-colors"
                  data-testid={`pending-license-${pendingUser.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-card-foreground">
                          {pendingUser.firstName} {pendingUser.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                        {pendingUser.brokerage && (
                          <p className="text-sm text-muted-foreground">{pendingUser.brokerage}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">License Number</p>
                          <p className="font-medium text-card-foreground">{pendingUser.licenseNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">State</p>
                          <p className="font-medium text-card-foreground">{pendingUser.licenseState}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Document</p>
                          {pendingUser.licenseDocumentUrl && (
                            <a
                              href={pendingUser.licenseDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 text-sm"
                            >
                              View Document
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => approveMutation.mutate(pendingUser.id)}
                      disabled={approveMutation.isPending}
                      className="rounded-lg"
                      data-testid={`button-approve-${pendingUser.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {approveMutation.isPending ? "Approving..." : "Approve"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
