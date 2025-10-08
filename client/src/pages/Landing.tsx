import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MapPin, DollarSign, MessageSquare, Shield, CheckCircle2, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AgentLink</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
              className="rounded-lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-background to-accent/20 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              On-Demand Coverage for
              <span className="text-primary"> Real Estate Professionals</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with licensed agents in your area for showings and open houses. 
              GPS-verified attendance, secure escrow payments, and real-time coordination.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-find-coverage"
                className="rounded-lg text-base px-8"
              >
                Find Coverage
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-start-earning"
                className="rounded-lg text-base px-8"
              >
                Start Earning
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How AgentLink Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple, secure, and reliable coverage for your real estate business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4 hover-elevate transition-all duration-200">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">GPS Verification</h3>
              <p className="text-muted-foreground">
                Check-in and check-out within 200ft of the property ensures accountability and verified attendance.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover-elevate transition-all duration-200">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">Secure Escrow</h3>
              <p className="text-muted-foreground">
                Payments held in escrow and automatically released upon job completion. Platform fee of 20% applies.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover-elevate transition-all duration-200">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">Real-Time Chat</h3>
              <p className="text-muted-foreground">
                Coordinate seamlessly with in-app messaging. Share updates, photos, and client feedback instantly.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover-elevate transition-all duration-200">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">License Verified</h3>
              <p className="text-muted-foreground">
                All agents are verified with active real estate licenses. Trust and professionalism guaranteed.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover-elevate transition-all duration-200">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">Rating System</h3>
              <p className="text-muted-foreground">
                Build your reputation with post-job reviews. Track communication, professionalism, and punctuality.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover-elevate transition-all duration-200">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">Instant Booking</h3>
              <p className="text-muted-foreground">
                Post or claim jobs in seconds. Get coverage when you need it, earn money when you're available.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join AgentLink today and experience the future of real estate coverage
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-join-now"
            className="rounded-lg text-base px-8"
          >
            Join AgentLink
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">AgentLink</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 AgentLink. On-demand coverage for real estate professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
