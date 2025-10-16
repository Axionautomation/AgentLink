# AgentLink - Claude Development Guide

## CRITICAL DEPLOYMENT WORKFLOW

**⚠️ IMPORTANT: After EVERY edit to the codebase, you MUST push changes to GitHub immediately.**

Render.com is configured to automatically deploy from the GitHub repository. The workflow is:
1. Make code changes locally
2. Commit changes to git
3. Push to GitHub (`git push origin main`)
4. Render.com automatically detects the push and deploys the updated code

**Without pushing to GitHub, your changes will NOT be deployed to production on Render.com.**

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server (Express + Vite HMR)
npm run build                  # Build for production
npm run start                  # Start production server
npm run check                  # TypeScript type checking
npm run db:push                # Push database schema changes

# Deployment Workflow (ALWAYS DO THIS AFTER EDITS)
git add .
git commit -m "Description of changes"
git push origin main           # Triggers Render.com deployment
```

## Project Overview

**AgentLink** is a real estate agent marketplace platform that connects agents for showing and open house coverage. It features:
- GPS-based job verification (200ft radius)
- Custom JWT authentication with bcrypt
- Stripe escrow payments with 20% platform fee
- Real-time WebSocket messaging
- Interactive Leaflet map with marker clustering
- Radar.io address autocomplete for job creation
- PostgreSQL database with Drizzle ORM

## Tech Stack

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (standard `pg` driver)
- **ORM**: Drizzle ORM with migrations via `drizzle-kit`
- **Authentication**: Custom JWT with bcrypt password hashing
- **Payments**: Stripe with manual capture for escrow
- **Real-time**: WebSocket server (ws library) on `/ws` path
- **Session**: Not using sessions - JWT tokens for auth

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: Wouter (lightweight routing)
- **State Management**: TanStack Query v5
- **UI Library**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Maps**: React Leaflet + react-leaflet-cluster
- **Address Autocomplete**: Radar.io API for smart address suggestions
- **Theme**: next-themes for dark mode support

### Deployment
- **Platform**: Render.com (auto-deploy from GitHub)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Repository**: https://github.com/Axionautomation/AgentLink

## Architecture

### Server Structure
```
server/
├── index.ts          # Main server entry, Express setup
├── routes.ts         # All API endpoints + WebSocket server
├── auth.ts           # JWT authentication utilities
├── storage.ts        # Database operations (Drizzle ORM)
├── db.ts             # Database connection
├── vite.ts           # Vite middleware for dev/production
└── replitAuth.ts     # Legacy Replit auth (not used)
```

### Client Structure
```
client/src/
├── App.tsx           # Main app with routing
├── main.tsx          # React entry point
├── lib/
│   ├── auth.tsx      # Auth context provider
│   └── queryClient.ts
├── components/
│   ├── JobMap.tsx    # Leaflet map with clustering
│   ├── NotificationBell.tsx
│   ├── ThemeProvider.tsx
│   └── ui/           # Shadcn/ui components
└── pages/
    ├── Landing.tsx
    ├── Login.tsx & Register.tsx
    ├── Dashboard.tsx  # Job discovery (map/list)
    ├── CreateJob.tsx
    ├── Checkout.tsx   # Stripe Payment Element
    ├── JobDetail.tsx
    ├── Messages.tsx   # Real-time chat
    ├── MyJobs.tsx
    ├── Wallet.tsx     # Earnings & withdrawals
    ├── Profile.tsx
    └── AdminLicenses.tsx
```

### Shared Code
```
shared/
└── schema.ts         # Drizzle schema + Zod validation
```

## Database Schema

### Core Tables

#### `users`
- Authentication: `email`, `password` (hashed with bcrypt)
- Profile: `firstName`, `lastName`, `bio`, `phone`, `profileImageUrl`
- License: `licenseNumber`, `licenseState`, `licenseVerified`, `licenseDocumentUrl`, `brokerage`
- Stats: `rating`, `totalJobs`, `completedJobs`
- Stripe: `stripeCustomerId`, `stripeAccountId`, `stripeFinancialConnectionsAccountId`, `stripeExternalAccountId`, `bankAccountLast4`, `bankName`
- Admin: `isAdmin` (protected field, cannot be set via API)

#### `jobs`
- Poster/Claimer: `posterId`, `claimerId` (references users)
- Address: `propertyAddress` (full formatted), `addressLine1`, `addressLine2`, `city`, `state`, `zipCode`
- Location: `propertyLat`, `propertyLng` (geocoded from address)
- Type: `propertyType` ('showing' | 'open_house')
- Schedule: `scheduledDate`, `scheduledTime`, `duration`
- Payment: `fee`, `platformFee` (20%), `payoutAmount`, `paymentIntentId`
- Status: `status` ('open' | 'claimed' | 'in_progress' | 'completed' | 'cancelled')
- GPS: `posterCheckedIn`, `claimerCheckedIn`, `claimerCheckedOut` + timestamps
- Escrow: `escrowHeld`, `paymentReleased`

#### `messages`
- Fields: `jobId`, `senderId`, `content`, `createdAt`
- Real-time via WebSocket

#### `reviews`
- Fields: `jobId`, `reviewerId`, `revieweeId`, `rating` (1-5), `quickFeedback`, `detailedReview`

#### `transactions`
- Types: `escrow_hold`, `escrow_release`, `platform_fee`, `refund`, `payout`
- Fields: `userId`, `jobId`, `amount`, `type`, `stripePaymentIntentId`, `stripePayoutId`, `status`, `metadata`

#### `checkIns`
- Fields: `jobId`, `userId`, `userType` ('poster' | 'claimer'), `checkInType` ('check_in' | 'check_out')
- GPS: `latitude`, `longitude`, `distanceFromProperty`

#### `notifications`
- Fields: `userId`, `jobId`, `type`, `title`, `message`, `read`, `createdAt`

#### `sessions`
- Legacy table for Replit Auth (not actively used with JWT)

## Authentication System

### JWT-Based Authentication

**Registration Flow** (`POST /api/auth/register`):
1. Validate email format and password strength (min 8 chars, uppercase, lowercase, number)
2. Check if user exists
3. Hash password with bcrypt (10 rounds)
4. Create user in database
5. Generate JWT token with `userId` and `email`
6. Return token + user info

**Login Flow** (`POST /api/auth/login`):
1. Validate email and password
2. Fetch user by email
3. Compare password with bcrypt
4. Generate JWT token
5. Return token + user info

**Protected Routes**:
- Middleware: `authenticateToken` extracts JWT from `Authorization: Bearer <token>` header
- Attaches `req.user = { userId, email }` for downstream use
- Returns 401 if token invalid/missing

**Admin Routes**:
- Additional middleware: `isAdmin` checks `user.isAdmin` in database
- Returns 403 if not admin
- Admin status can ONLY be set via direct SQL for security

### Security Notes
- Passwords are hashed with bcrypt (never stored plaintext)
- JWT secret from `process.env.JWT_SECRET`
- `isAdmin` field is protected - stripped from all `upsertUser` calls to prevent privilege escalation
- Token expires after 7 days (configurable in auth.ts)

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/user` - Get current user (requires auth)

### Jobs
- `GET /api/jobs` - List all open jobs (with poster info)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (creates Stripe PaymentIntent)
- `POST /api/jobs/:id/claim` - Claim a job
- `POST /api/jobs/:id/check-in` - GPS check-in (200ft radius validation)
- `POST /api/jobs/:id/check-out` - GPS check-out
- `POST /api/jobs/:id/complete` - Complete job, capture payment, release escrow
- `GET /api/my-jobs/posted` - User's posted jobs
- `GET /api/my-jobs/claimed` - User's claimed jobs

### Messages
- `GET /api/jobs/:jobId/messages` - Get messages for job
- `POST /api/jobs/:jobId/messages` - Send message (broadcasts via WebSocket)

### Reviews
- `POST /api/jobs/:jobId/review` - Submit review after job completion

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/:id/read` - Mark notification as read

### Payments & Withdrawals
- `POST /api/create-payment-intent` - Create Stripe PaymentIntent for job posting
- `POST /api/create-financial-connections-session` - Link bank account
- `POST /api/link-bank-account` - Store bank account details
- `POST /api/create-payout` - Create instant payout
- `GET /api/transactions` - Get transaction history

### Admin
- `GET /api/admin/licenses` - Get pending license verifications (admin only)
- `POST /api/admin/licenses/:userId/approve` - Approve license (admin only)
- `POST /api/admin/licenses/:userId/reject` - Reject license (admin only)

### WebSocket
- URL: `ws://localhost:5000/ws` (dev) or `wss://your-domain.com/ws` (production)
- Broadcasts new messages to all connected clients
- Simple broadcast model (no auth currently)

## Key Features & Implementation

### GPS Verification
**Location**: [server/routes.ts](server/routes.ts)

Uses Haversine formula to calculate distance between check-in location and property:
```typescript
function haversineDistance(lat1, lon1, lat2, lon2) {
  // Returns distance in feet
  // Validates within 200ft radius
}
```

**Check-in Process**:
1. Claimer sends GPS coordinates to `POST /api/jobs/:id/check-in`
2. Server validates distance from property location
3. If within 200ft, creates `checkIn` record and updates job status to `in_progress`
4. Returns success with distance info

**Check-out Process**:
1. Claimer sends GPS coordinates to `POST /api/jobs/:id/check-out`
2. Server validates distance and creates check-out record
3. Job ready to be completed by poster

### Payment Flow (Stripe Escrow)
**Location**: [server/routes.ts](server/routes.ts)

**1. Job Creation** (`POST /api/jobs`):
```typescript
// Calculate fees
const platformFee = fee * 0.20; // 20% platform fee
const payoutAmount = fee - platformFee;

// Create PaymentIntent with manual capture
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(fee * 100), // Convert to cents
  currency: 'usd',
  customer: stripeCustomerId,
  capture_method: 'manual', // Escrow mode
  metadata: { jobId, posterId }
});

// Create transaction record
await storage.createTransaction({
  userId: posterId,
  jobId,
  type: 'escrow_hold',
  amount: fee.toString(),
  stripePaymentIntentId: paymentIntent.id,
  status: 'pending'
});
```

**2. Payment Processing** (Checkout page):
- User completes payment on `/checkout/:jobId` using Stripe Payment Element
- Stripe confirms payment but does NOT capture yet (manual capture)
- Redirects to `/payment-success`

**3. Job Completion** (`POST /api/jobs/:id/complete`):
```typescript
// Capture the payment
await stripe.paymentIntents.capture(paymentIntentId);

// Create escrow release transaction
await storage.createTransaction({
  userId: claimerId,
  type: 'escrow_release',
  amount: payoutAmount.toString()
});

// Create platform fee transaction
await storage.createTransaction({
  userId: posterId,
  type: 'platform_fee',
  amount: platformFee.toString()
});

// Update job status
await storage.updateJob(jobId, {
  status: 'completed',
  paymentReleased: true
});
```

**4. Withdrawals** (`POST /api/create-payout`):
- Calculates available balance: `sum(escrow_release) - sum(completed_payouts)`
- Validates withdrawal amount against balance
- Creates Stripe payout (note: requires Stripe Connect in production)
- Creates payout transaction record

### Address Autocomplete (Radar.io)
**Location**: [client/src/pages/CreateJob.tsx](client/src/pages/CreateJob.tsx) - Address input field

Uses Radar.io API for intelligent address suggestions as users type:
```typescript
const response = await fetch(
  `https://api.radar.io/v1/search/autocomplete?query=${encodeURIComponent(query)}&layers=address&limit=5`,
  {
    headers: {
      'Authorization': radarKey,
    },
  }
);
```

**Features**:
- Real-time address suggestions as user types (300ms debounce)
- Auto-fills address line 1, city, state, and ZIP code
- Validates and formats addresses automatically
- Reduces data entry errors
- Uses Radar.io live API keys (stored in environment variables)

**Flow**:
1. User starts typing in Address Line 1 field
2. After 300ms debounce, Radar API is called with query
3. Dropdown shows up to 5 matching addresses
4. User clicks a suggestion
5. Form fields auto-fill: addressLine1, city, state, zipCode
6. User can still manually edit any field if needed

### Geocoding
**Location**: [server/routes.ts](server/routes.ts) - `POST /api/jobs`

Uses OpenStreetMap Nominatim API (free, no API key required):
```typescript
const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`;
const geoResponse = await fetch(geocodeUrl);
const geoData = await geoResponse.json();

if (geoData.length > 0) {
  propertyLat = geoData[0].lat;
  propertyLng = geoData[0].lon;
}
```

**Note**: Nominatim has rate limits. For production, consider:
- Google Maps Geocoding API
- Mapbox Geocoding API
- Self-hosted Nominatim instance

### Real-time Messaging
**Location**: [server/routes.ts](server/routes.ts) - `registerRoutes` function

WebSocket server is created alongside HTTP server:
```typescript
const wss = new WebSocketServer({
  server,
  path: '/ws'
});

wss.on('connection', (ws) => {
  // Store connected clients
  // Broadcast messages to all clients
});
```

**Message Flow**:
1. User sends message via `POST /api/jobs/:jobId/messages`
2. Message saved to database
3. Server broadcasts to all WebSocket clients:
```typescript
const broadcastData = JSON.stringify({
  type: 'new_message',
  message: newMessage
});
wss.clients.forEach(client => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(broadcastData);
  }
});
```

### Map with Clustering
**Location**: [client/src/components/JobMap.tsx](client/src/components/JobMap.tsx)

Uses `react-leaflet` + `react-leaflet-cluster`:
```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Custom orange marker icon
const customIcon = L.divIcon({
  html: '<div class="custom-marker">...</div>',
  className: 'custom-marker-wrapper'
});

<MapContainer center={[39.8283, -98.5795]} zoom={4}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <MarkerClusterGroup>
    {jobs.map(job => (
      <Marker
        position={[job.propertyLat, job.propertyLng]}
        icon={customIcon}
      >
        <Popup>Job details</Popup>
      </Marker>
    ))}
  </MarkerClusterGroup>
</MapContainer>
```

## Design System

### Color Palette
Theme uses HSL values for easy dark mode switching.

**Light Mode**:
- Primary (Orange): `25 95% 55%`
- Background: `0 0% 100%`
- Card: `0 0% 100%`
- Foreground: `20 14.3% 4.1%`

**Dark Mode** (default):
- Primary (Orange): `25 95% 55%` (same)
- Background: `20 14.3% 4.1%`
- Card: `24 9.8% 10%`
- Foreground: `60 9.1% 97.8%`

**Semantic Colors**:
- Success: `142 76% 36%` (green)
- Warning: `38 92% 50%` (yellow)
- Error: `0 84% 60%` (red)
- Info: `217 91% 60%` (blue)

### Typography
- **Font Family**: Inter (via Google Fonts)
- **Monospace**: JetBrains Mono (for amounts, IDs)
- **Scale**: Tailwind default (text-xs to text-4xl)

### Component Styling
- Rounded corners: `rounded-lg` (8px)
- Shadows: Custom elevation system in Tailwind config
- Mobile-first responsive design
- All components use Tailwind CSS utilities

## Environment Variables

### Required
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Stripe
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_test_... or pk_live_...

# Radar.io (Address Autocomplete)
RADAR_SECRET_KEY=prj_live_sk_...
VITE_RADAR_PUBLIC_KEY=prj_live_pk_...

# Server (auto-configured on Render)
PORT=5000
NODE_ENV=production
```

### Development Only
```env
NODE_ENV=development
```

## Deployment on Render.com

### Current Configuration
- **Service Type**: Web Service
- **Repository**: https://github.com/Axionautomation/AgentLink
- **Branch**: main
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Auto-Deploy**: Yes (triggers on push to main)

### Build Process
1. `npm install` - Install dependencies
2. `npm run build` - Runs:
   - `vite build` - Builds React client to `dist/public`
   - `esbuild server/index.ts` - Bundles server to `dist/index.js`
3. `npm run start` - Runs `node dist/index.js`

### Production Server
In production (`NODE_ENV=production`):
- Server serves static files from `dist/public`
- No Vite dev server or HMR
- All requests to non-API routes serve `index.html` (SPA mode)
- WebSocket server runs on same port as HTTP server

### Database Migrations
After schema changes in `shared/schema.ts`:
```bash
# Locally (recommended)
export DATABASE_URL="your-production-db-url"
npm run db:push

# Or via Render shell
npm run db:push
```

### Monitoring
- **Logs**: Render Dashboard → Your Service → Logs
- **Metrics**: Render Dashboard → Your Service → Metrics
- **Health Check**: GET `/api/auth/user` (returns 401 without auth, but confirms server is up)

## Development Workflow

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Push database schema
npm run db:push

# 4. Start dev server
npm run dev
# Opens on http://localhost:5000

# 5. Make changes (hot reload enabled)
# Edit files in client/src or server/

# 6. Commit and push to GitHub (triggers Render deploy)
git add .
git commit -m "Description"
git push origin main
```

### Production Build Testing
```bash
# Build for production
npm run build

# Test production build locally
NODE_ENV=production npm run start
```

### Database Changes
```bash
# 1. Edit shared/schema.ts
# 2. Push changes to database
npm run db:push

# 3. Verify changes
# Check your database directly or use Drizzle Studio
```

### Adding New Features
1. Create new API endpoint in `server/routes.ts`
2. Update schema if database changes needed (`shared/schema.ts`)
3. Add frontend page in `client/src/pages/`
4. Add route in `client/src/App.tsx`
5. Test locally with `npm run dev`
6. **Commit and push to GitHub** (deploys to Render automatically)

## Common Tasks

### Creating an Admin User
Admin status cannot be set via API for security. Use direct SQL:
```sql
-- Connect to your production database
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

### Generating a JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Testing Stripe Payments
Use Stripe test mode:
- Cards: `4242 4242 4242 4242` (any future date, any CVC)
- 3DS: `4000 0027 6000 3184`
- Declined: `4000 0000 0000 0002`

### Viewing WebSocket Connections
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:5000/ws');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

### Checking Database Connections
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## Troubleshooting

### Build Fails
**Error**: "Cannot find module"
- Check all imports use correct paths
- Verify `package.json` includes dependency
- Run `npm install`

**Error**: "Type errors"
- Run `npm run check` to see TypeScript errors
- Fix type issues before deploying

### Database Connection Issues
**Error**: "Connection refused"
- Verify `DATABASE_URL` is set correctly
- Check if database allows external connections
- For Render PostgreSQL, ensure SSL is enabled

**Error**: "relation does not exist"
- Run `npm run db:push` to sync schema

### Authentication Not Working
**Error**: 401 Unauthorized
- Check `Authorization: Bearer <token>` header is sent
- Verify JWT token hasn't expired
- Check `JWT_SECRET` matches between environments

**Error**: 403 Forbidden (admin routes)
- Verify user has `isAdmin = true` in database
- Cannot be set via API - use direct SQL

### Stripe Payment Issues
**Error**: "No such customer"
- User might not have Stripe customer ID
- Check `stripeCustomerId` field in users table

**Error**: "Payment intent not found"
- Check `paymentIntentId` is saved correctly
- Verify Stripe API key matches environment (test vs live)

### Map Not Loading
**Error**: Blank map or markers not showing
- Check jobs have valid `propertyLat` and `propertyLng`
- Verify OpenStreetMap tiles are loading (check network tab)
- Check for CORS issues

### WebSocket Connection Fails
**Error**: "WebSocket connection failed"
- In production, use `wss://` not `ws://`
- Verify Render allows WebSocket connections
- Check firewall rules

## Best Practices

### Code Organization
- Keep route handlers in `server/routes.ts`
- Database operations in `server/storage.ts`
- Shared types in `shared/schema.ts`
- Reusable UI components in `client/src/components/`
- Pages in `client/src/pages/`

### Security
- NEVER commit `.env` file (in `.gitignore`)
- ALWAYS hash passwords with bcrypt
- VALIDATE user input with Zod schemas
- SANITIZE SQL queries (Drizzle ORM handles this)
- PROTECT admin routes with `isAdmin` middleware
- STRIP `isAdmin` from all `upsertUser` calls

### Performance
- Use TanStack Query for data fetching (automatic caching)
- Implement pagination for large lists
- Use Leaflet clustering for many map markers
- Optimize images (compress, lazy load)
- Use WebSocket sparingly (consider polling for less critical data)

### Database
- ALWAYS use prepared statements (Drizzle ORM does this)
- INDEX foreign keys (already done in schema)
- AVOID N+1 queries (use joins)
- Use transactions for multi-step operations

### Git Workflow
- Commit frequently with descriptive messages
- **ALWAYS push to GitHub after edits** (triggers Render deploy)
- Use branches for major features (merge to main when ready)
- Don't commit `node_modules`, `dist`, `.env`

## Feature Roadmap

### Completed
- ✅ Custom JWT authentication
- ✅ Job creation with geocoding
- ✅ GPS verification system
- ✅ Stripe escrow payments
- ✅ Real-time WebSocket chat
- ✅ Admin license verification
- ✅ Wallet and withdrawals
- ✅ Interactive map with clustering
- ✅ Dark mode support

### In Progress
- 🔄 Enhanced notification system
- 🔄 Email notifications (SendGrid/Mailgun)
- 🔄 Push notifications (web push API)

### Planned
- 📋 ARELLO API integration for automated license verification
- 📋 Advanced search and filtering
- 📋 Property image uploads (S3/Cloudinary)
- 📋 Brokerage accounts (multi-agent teams)
- 📋 Commission splitting
- 📋 Advanced cancellation policies
- 📋 Rescheduling workflow
- 📋 AI-powered agent matching
- 📋 Performance analytics dashboard
- 📋 Mobile app (React Native)

## Useful Resources

### Documentation
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Leaflet Docs](https://leafletjs.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

### Tools
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Render Dashboard](https://dashboard.render.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## Support & Contact

- **Repository**: https://github.com/Axionautomation/AgentLink
- **Issues**: https://github.com/Axionautomation/AgentLink/issues

---

**Remember**: After every code change, commit and push to GitHub to deploy to Render.com!
