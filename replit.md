# AgentLink - Real Estate Agent Marketplace

## Overview
AgentLink is an on-demand marketplace platform connecting real estate agents for showing and open house coverage. The platform features GPS-based verification, Stripe escrow payments, real-time chat, and a comprehensive review system.

## Current Status
**MVP Features Implemented:**
- ✅ Complete data schema with 8 tables (users, jobs, messages, reviews, transactions, checkIns, notifications, sessions)
- ✅ Replit Auth integration for user authentication
- ✅ PostgreSQL database with Drizzle ORM
- ✅ All API endpoints (jobs CRUD, claims, GPS check-in/out, messages, reviews, payments)
- ✅ Stripe escrow payment system with 20% platform fee
- ✅ WebSocket server for real-time messaging on /ws path
- ✅ GPS verification within 200ft radius using Haversine formula
- ✅ Complete frontend pages (Landing, Dashboard with map/list views, CreateJob, JobDetail, Messages, Review, Profile, MyJobs, Wallet)
- ✅ Material Design 3 with orange primary color and dark mode support

## Recent Changes (Latest Session)
- Added transactions and checkIns tables to schema
- Implemented complete Stripe escrow flow with platform fee calculation
- Added GPS validation with Haversine distance calculation
- Enhanced check-in/check-out endpoints with coordinate verification
- Added transaction recording for all payment operations
- Improved error handling for missing property coordinates

## Architecture

### Backend Stack
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Payments**: Stripe with manual capture for escrow
- **Real-time**: WebSocket server on /ws path
- **Session Storage**: PostgreSQL with connect-pg-simple

### Frontend Stack
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Forms**: React Hook Form with Zod validation
- **Maps**: React Leaflet for job discovery
- **Theme**: Custom ThemeProvider with dark mode support

### Database Schema

#### Core Tables
1. **users** - Agent profiles with license info, stats, Stripe IDs
2. **sessions** - Auth session storage (required for Replit Auth)
3. **jobs** - Job listings with property details, GPS coords, payment tracking
4. **messages** - Chat messages between poster and claimer
5. **reviews** - Post-job ratings (1-5 stars) with quick feedback
6. **notifications** - System notifications for job events
7. **transactions** - Complete payment audit trail (escrow_hold, escrow_release, platform_fee, refund)
8. **checkIns** - GPS verification records with coordinates and distance validation

### Key Features

#### GPS Verification
- Check-in/check-out within 200ft radius of property
- Haversine formula for accurate distance calculation
- Persistent check-in records with coordinates
- Automatic job status updates based on verification

#### Payment Flow (Stripe Escrow)
1. **Job Post**: PaymentIntent created with manual capture, 20% platform fee calculated
2. **Escrow Hold**: Transaction recorded with fee breakdown
3. **Job Completion**: 
   - PaymentIntent captured
   - Escrow release transaction recorded
   - Platform fee transaction recorded
   - Agent receives 80% payout
   - Notifications sent

#### Real-time Features
- WebSocket server on /ws path (avoids Vite HMR conflict)
- Broadcasts all messages to connected clients
- Job status updates via WebSocket

### API Endpoints

#### Auth
- `GET /api/auth/user` - Get current user
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout user

#### Jobs
- `GET /api/jobs` - List all open jobs with poster info
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (with Stripe PaymentIntent)
- `POST /api/jobs/:id/claim` - Claim a job
- `POST /api/jobs/:id/check-in` - GPS check-in
- `POST /api/jobs/:id/check-out` - GPS check-out
- `POST /api/jobs/:id/complete` - Complete job and release payment
- `GET /api/my-jobs/posted` - Get user's posted jobs
- `GET /api/my-jobs/claimed` - Get user's claimed jobs

#### Messages
- `GET /api/jobs/:jobId/messages` - Get job messages
- `POST /api/jobs/:jobId/messages` - Send message

#### Reviews
- `POST /api/jobs/:jobId/review` - Submit review

#### Notifications
- `GET /api/notifications` - Get user notifications

#### Payments
- `POST /api/create-payment-intent` - Create payment intent

### Frontend Pages

1. **Landing** (`/`) - Hero with login for unauthenticated users
2. **Dashboard** (`/`) - Map/list toggle, job discovery, filters
3. **CreateJob** (`/create-job`) - Job posting form with Stripe payment
4. **JobDetail** (`/jobs/:id`) - Job details, claim, check-in/out, complete actions
5. **Messages** (`/messages/:jobId`) - Real-time chat interface
6. **Review** (`/jobs/:jobId/review`) - Star rating and feedback form
7. **Profile** (`/profile`) - Agent profile with stats and license info
8. **MyJobs** (`/my-jobs`) - Tabs for posted/claimed jobs
9. **Wallet** (`/wallet`) - Earnings and transaction history

### Design System

#### Colors (Material Design 3)
- **Primary**: Orange (`25 95% 55%`) - Trust and energy
- **Background**: `0 0% 100%` (light) / `20 14.3% 4.1%` (dark)
- **Card**: `0 0% 100%` (light) / `24 9.8% 10%` (dark)
- **Foreground**: `20 14.3% 4.1%` (light) / `60 9.1% 97.8%` (dark)

#### Typography
- **Font**: Inter (system fallback chain)
- **Sizes**: Consistent scale from text-xs to text-4xl
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

#### Components
- Custom elevation system with hover-elevate/active-elevate-2 utilities
- Consistent rounded-lg borders
- Mobile-first responsive design
- Shadcn/ui components throughout

### Environment Variables

#### Required Secrets
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `STRIPE_SECRET_KEY` - Stripe secret key (starts with sk_)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (starts with pk_)

#### Auto-configured
- `REPLIT_DOMAINS` - Configured by Replit
- `REPL_ID` - Configured by Replit
- `ISSUER_URL` - OIDC issuer (defaults to https://replit.com/oidc)

### Development Workflow

#### Running the App
```bash
npm run dev  # Starts Express + Vite dev server on port 5000
```

#### Database Migrations
```bash
npm run db:push  # Push schema changes to database
npm run db:push --force  # Force push if conflicts
```

#### Key Files
- `shared/schema.ts` - Database schema and TypeScript types
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database operations
- `server/replitAuth.ts` - Authentication setup
- `client/src/App.tsx` - Frontend routing
- `design_guidelines.md` - UI/UX design system

### Next Steps / TODO
1. ⏳ Integration testing - Test complete user journeys
2. ⏳ Error handling - Add comprehensive error states
3. ⏳ Loading states - Add skeleton loaders everywhere
4. ⏳ Real-time WebSocket integration in frontend
5. ⏳ Stripe Connect setup for actual payouts to agents
6. ⏳ License verification flow
7. ⏳ Image upload for property photos
8. ⏳ Push notifications for mobile
9. ⏳ Search and filtering improvements
10. ⏳ Transaction history in Wallet

### Known Limitations
- Stripe payouts currently use basic capture (needs Stripe Connect for production)
- WebSocket doesn't persist auth state (needs session-based auth for WS)
- GPS validation doesn't account for building height/indoor accuracy
- No image upload for properties yet
- License verification is manual (needs automated verification)

### User Preferences
- Follow Material Design 3 principles
- Prioritize mobile-first design
- Use orange as primary brand color
- Maintain clean, professional aesthetic
- Emphasize trust and reliability in UI
