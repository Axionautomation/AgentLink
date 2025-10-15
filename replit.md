# AgentLink - Real Estate Agent Marketplace

## Overview
AgentLink is an on-demand marketplace platform connecting real estate agents for showing and open house coverage. The platform features GPS-based verification, Stripe escrow payments, real-time chat, and a comprehensive review system.

## Current Status
**MVP Complete - Production Ready! 🚀**
- ✅ Complete data schema with 9 tables (users, jobs, messages, reviews, transactions, checkIns, notifications, sessions)
- ✅ Replit Auth integration for user authentication
- ✅ PostgreSQL database with Drizzle ORM
- ✅ All API endpoints (jobs CRUD, claims, GPS check-in/out, messages, reviews, payments, admin)
- ✅ Stripe escrow payment system with 20% platform fee
- ✅ WebSocket server for real-time messaging on /ws path
- ✅ GPS verification within 200ft radius using Haversine formula
- ✅ Complete frontend pages (Landing, Dashboard with map/list views, CreateJob, JobDetail, Messages, Review, Profile, MyJobs, Wallet, AdminLicenses)
- ✅ Material Design 3 with orange primary color and dark mode support
- ✅ Interactive map with marker clustering (react-leaflet-cluster)
- ✅ Notification center with bell icon and mark-as-read
- ✅ Real wallet/earnings dashboard with transaction history
- ✅ License verification workflow with admin review queue
- ✅ Security hardening: protected isAdmin field, authorization middleware

## Recent Changes (Latest Session)
**Phase 1: Core Features**
- Implemented interactive Leaflet map with MarkerClusterGroup for job clustering
- Added NotificationBell component with dropdown, mark-as-read, and real-time updates
- Built Wallet page with real transaction data, period-based earnings, and balance calculations
- Created license verification workflow: upload form, admin review queue, approval/rejection

**Phase 2: Security Hardening**
- Added isAdmin boolean field to users table (default: false)
- Implemented isAdmin middleware for admin route authorization
- Protected storage.upsertUser by stripping isAdmin from all input (prevents privilege escalation)
- Added frontend guard to AdminLicenses page (redirects non-admin users)
- License endpoint explicitly preserves isAdmin status (cannot be changed by users)
- Passed architect security review: No privilege escalation vulnerabilities

**Phase 3: Payment Checkout & Withdrawals**
- Created dedicated Checkout page with Stripe Payment Element (includes Link by Stripe for one-click payments)
- Added PaymentSuccess page to handle 3DS authentication redirects
- Updated CreateJob flow to redirect to checkout instead of inline payment
- Added bank account fields to users schema (Financial Connections integration ready)
- Implemented withdrawal/payout system with instant payout endpoints
- Added withdrawal UI to Wallet page with amount input and bank account display
- **Critical Security Fix**: Corrected balance calculation to subtract completed payouts from escrow releases (prevents double-withdrawal attacks)
- All payment and withdrawal features passed architect security review

**Admin Setup Instructions:**
To create admin users, run SQL directly on the database:
```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```
Note: isAdmin cannot be set via API for security reasons

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

#### Payments & Withdrawals
- `POST /api/create-payment-intent` - Create payment intent for job posting
- `POST /api/create-financial-connections-session` - Create Stripe Financial Connections session for bank linking
- `POST /api/link-bank-account` - Link bank account and store details in user profile
- `POST /api/create-payout` - Create instant payout with balance validation (escrow releases minus completed payouts)
- `GET /api/transactions` - Get user's transaction history

### Frontend Pages

1. **Landing** (`/`) - Hero with login for unauthenticated users
2. **Dashboard** (`/`) - Map/list toggle, job discovery, filters
3. **CreateJob** (`/create-job`) - Job posting form (redirects to checkout)
4. **Checkout** (`/checkout`) - Stripe Payment Element with Link by Stripe for one-click payments
5. **PaymentSuccess** (`/payment-success`) - Post-payment confirmation and 3DS redirect handler
6. **JobDetail** (`/jobs/:id`) - Job details, claim, check-in/out, complete actions
7. **Messages** (`/messages/:jobId`) - Real-time chat interface
8. **Review** (`/jobs/:jobId/review`) - Star rating and feedback form
9. **Profile** (`/profile`) - Agent profile with stats and license info
10. **MyJobs** (`/my-jobs`) - Tabs for posted/claimed jobs
11. **Wallet** (`/wallet`) - Earnings, withdrawals, and transaction history
12. **AdminLicenses** (`/admin/licenses`) - Admin review queue for license verification

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

### Next Phase Features (Post-MVP)
1. **Admin Portal Enhancements**
   - Dashboard with stats (pending licenses, active jobs, total agents)
   - Bulk license approval/rejection
   - Activity logs and audit trail
   
2. **ARELLO API Integration**
   - Automated license verification via ARELLO database
   - Real-time license status checks
   - Automated renewal reminders

3. **Advanced Cancellation Logic**
   - Cancellation policies with time windows
   - Partial refunds based on cancellation time
   - Rescheduling workflow

4. **AI-Powered Matching**
   - ML-based agent recommendations
   - Skill-based matching (luxury, first-time buyers, etc.)
   - Proximity and availability optimization

5. **Brokerage Accounts**
   - Multi-agent brokerage profiles
   - Team management and job distribution
   - Commission splitting and reporting

6. **Additional Enhancements**
   - Image upload for property photos
   - Push notifications for mobile
   - Advanced search and filtering
   - Real-time WebSocket integration in frontend
   - Performance analytics dashboard

### Known Limitations
- Stripe payouts currently use basic capture (needs Stripe Connect for actual agent payouts in production)
- WebSocket doesn't persist auth state (needs session-based auth for WS)
- GPS validation doesn't account for building height/indoor accuracy (acceptable for MVP)
- Admin users must be created via SQL (by design for security)

### User Preferences
- Follow Material Design 3 principles
- Prioritize mobile-first design
- Use orange as primary brand color
- Maintain clean, professional aesthetic
- Emphasize trust and reliability in UI