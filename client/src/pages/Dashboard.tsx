import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, List, Clock, DollarSign, Home, Building2, Filter, Search, MapPinned, Phone, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { JobMap } from "@/components/JobMap";
import { NotificationBell } from "@/components/NotificationBell";
import type { Job } from "@shared/schema";
import { Link, useLocation } from "wouter";

interface JobWithDistance extends Job {
  distance?: number;
  posterName?: string;
  poster?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"map" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMaxDistance, setFilterMaxDistance] = useState<string>("all");
  const [filterMinFee, setFilterMinFee] = useState<string>("");
  const [filterMaxFee, setFilterMaxFee] = useState<string>("");

  const { data: jobs = [], isLoading } = useQuery<JobWithDistance[]>({
    queryKey: ["/api/jobs"],
  });

  // Calculate distances and sort jobs
  const jobsWithDistance = jobs.map(job => {
    if (latitude && longitude && job.propertyLat && job.propertyLng) {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(job.propertyLat),
        parseFloat(job.propertyLng)
      );
      return { ...job, distance };
    }
    return job;
  }).sort((a, b) => (a.distance || 999) - (b.distance || 999));

  // Filter jobs
  const filteredJobs = jobsWithDistance.filter(job => {
    if (job.status !== 'open') return false;
    
    if (searchQuery && !job.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    if (filterType !== 'all' && job.propertyType !== filterType) {
      return false;
    }
    
    if (filterMaxDistance !== 'all' && job.distance) {
      const maxDist = parseInt(filterMaxDistance);
      if (job.distance > maxDist) return false;
    }
    
    if (filterMinFee && parseFloat(job.fee) < parseFloat(filterMinFee)) {
      return false;
    }
    
    if (filterMaxFee && parseFloat(job.fee) > parseFloat(filterMaxFee)) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">AgentLink</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/">
                <Button variant="ghost" size="sm" className="rounded-lg" data-testid="link-marketplace">
                  Marketplace
                </Button>
              </Link>
              <Link href="/my-jobs">
                <Button variant="ghost" size="sm" className="rounded-lg" data-testid="link-my-jobs">
                  My Jobs
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="ghost" size="sm" className="rounded-lg" data-testid="link-messages">
                  Messages
                </Button>
              </Link>
              <Link href="/wallet">
                <Button variant="ghost" size="sm" className="rounded-lg" data-testid="link-wallet">
                  Wallet
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/create-job">
              <Button data-testid="button-post-job" className="rounded-lg">
                Post Job
              </Button>
            </Link>
            <NotificationBell />
            <ThemeToggle />
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-profile">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt={user.firstName || 'User'} 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                  </div>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-lg"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px] rounded-lg" data-testid="select-property-type">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="showing">Showing</SelectItem>
                  <SelectItem value="open_house">Open House</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMaxDistance} onValueChange={setFilterMaxDistance}>
                <SelectTrigger className="w-full md:w-[180px] rounded-lg" data-testid="select-distance">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Distances</SelectItem>
                  <SelectItem value="5">Within 5 mi</SelectItem>
                  <SelectItem value="10">Within 10 mi</SelectItem>
                  <SelectItem value="25">Within 25 mi</SelectItem>
                  <SelectItem value="50">Within 50 mi</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min Fee"
                  value={filterMinFee}
                  onChange={(e) => setFilterMinFee(e.target.value)}
                  className="w-28 rounded-lg"
                  data-testid="input-min-fee"
                />
                <Input
                  type="number"
                  placeholder="Max Fee"
                  value={filterMaxFee}
                  onChange={(e) => setFilterMaxFee(e.target.value)}
                  className="w-28 rounded-lg"
                  data-testid="input-max-fee"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} available
              </p>
              <Tabs value={view} onValueChange={(v) => setView(v as "map" | "list")} className="w-auto">
                <TabsList className="rounded-lg">
                  <TabsTrigger value="list" className="rounded-md" data-testid="tab-list-view">
                    <List className="h-4 w-4 mr-2" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="map" className="rounded-md" data-testid="tab-map-view">
                    <MapPinned className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Card>

        {/* Job Listings */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </Card>
            ))}
          </div>
        ) : view === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <Card 
                key={job.id} 
                className="p-4 space-y-3 hover-elevate transition-all duration-200 cursor-pointer relative"
                onClick={() => setLocation(`/jobs/${job.id}`)}
                data-testid={`card-job-${job.id}`}
              >
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground font-mono text-base px-3 py-1 rounded-lg">
                    ${parseFloat(job.fee).toFixed(0)}
                  </Badge>
                </div>

                <div className="space-y-2 pr-20">
                  <div className="flex items-start gap-2">
                    {job.propertyType === 'showing' ? (
                      <Home className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    ) : job.propertyType === 'open_house' ? (
                      <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    ) : (
                      <Home className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-card-foreground truncate">
                        {job.propertyAddress}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {job.propertyType === 'other' && job.propertyTypeOther
                          ? job.propertyTypeOther
                          : job.propertyType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(job.scheduledDate).toLocaleDateString()} • {job.scheduledTime}</span>
                  </div>

                  {job.distance !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{job.distance.toFixed(1)} mi away</span>
                    </div>
                  )}

                  {job.poster && (
                    <div className="pt-2 border-t border-border space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{job.poster.firstName} {job.poster.lastName}</span>
                      </div>
                      {job.poster.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${job.poster.phone}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {job.poster.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full rounded-lg" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/jobs/${job.id}`);
                  }}
                  data-testid={`button-view-job-${job.id}`}
                >
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4">
            <JobMap 
              jobs={filteredJobs} 
              userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
            />
          </Card>
        )}

        {filteredJobs.length === 0 && !isLoading && (
          <Card className="p-12">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">No jobs found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Try adjusting your filters or check back later for new opportunities
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
