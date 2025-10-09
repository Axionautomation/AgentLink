import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useLocation } from 'wouter';
import L from 'leaflet';
import { Home, Building2, DollarSign, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Job } from '@shared/schema';
import 'leaflet/dist/leaflet.css';

interface JobWithDistance extends Job {
  distance?: number;
}

interface JobMapProps {
  jobs: JobWithDistance[];
  userLocation?: { lat: number; lng: number } | null;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11);
  }, [center, map]);
  return null;
}

const createCustomIcon = (fee: string, propertyType: string) => {
  const isShowingIcon = propertyType === 'showing';
  const iconColor = '#F97316';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <div style="
          background-color: ${iconColor};
          color: white;
          border-radius: 20px;
          padding: 4px 12px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span style="font-family: 'JetBrains Mono', monospace;">$${parseFloat(fee).toFixed(0)}</span>
        </div>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid ${iconColor};
        "></div>
      </div>
    `,
    iconSize: [60, 40],
    iconAnchor: [30, 40],
  });
};

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div style="
      width: 16px;
      height: 16px;
      background-color: #3B82F6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function JobMap({ jobs, userLocation }: JobMapProps) {
  const [, setLocation] = useLocation();
  const mapRef = useRef<L.Map>(null);

  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng]
    : [37.7749, -122.4194];

  const jobsWithCoordinates = jobs.filter(
    job => job.propertyLat && job.propertyLng
  );

  return (
    <div className="h-[600px] rounded-lg overflow-hidden relative">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap center={defaultCenter} />

        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="text-sm font-medium">Your Location</div>
            </Popup>
          </Marker>
        )}

        {jobsWithCoordinates.map((job) => (
          <Marker
            key={job.id}
            position={[parseFloat(job.propertyLat!), parseFloat(job.propertyLng!)]}
            icon={createCustomIcon(job.fee, job.propertyType)}
            eventHandlers={{
              click: () => {
                setLocation(`/jobs/${job.id}`);
              },
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]" data-testid={`map-popup-${job.id}`}>
                <div className="flex items-start gap-2 mb-2">
                  {job.propertyType === 'showing' ? (
                    <Home className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <Building2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{job.propertyAddress}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {job.propertyType.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-mono font-semibold">${parseFloat(job.fee).toFixed(2)}</span>
                </div>

                {job.distance !== undefined && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <MapPin className="h-3 w-3" />
                    <span>{job.distance.toFixed(1)} mi away</span>
                  </div>
                )}

                <Button 
                  size="sm" 
                  className="w-full rounded-lg text-xs h-7"
                  onClick={() => setLocation(`/jobs/${job.id}`)}
                  data-testid={`button-view-job-map-${job.id}`}
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
