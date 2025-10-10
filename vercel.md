# Deploying AgentLink to Vercel

This guide walks you through deploying the AgentLink application to Vercel from your GitHub repository.

## Prerequisites

- GitHub account with the AgentLink repository
- Vercel account (sign up at https://vercel.com)
- PostgreSQL database (e.g., Neon, Supabase, or Railway)
- Stripe account with API keys

## Step 1: Prepare Your Database

### Option A: Neon (Recommended)
1. Go to https://neon.tech and create a free account
2. Create a new project
3. Copy the connection string (it should look like: `postgresql://user:password@host/database?sslmode=require`)

### Option B: Supabase
1. Go to https://supabase.com and create a project
2. Navigate to Database → Settings → Connection String
3. Copy the connection pooler string

### Option C: Railway
1. Go to https://railway.app and create a PostgreSQL database
2. Copy the connection string from the database settings

## Step 2: Connect GitHub to Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select **"Import Third-Party Git Repository"** (if needed)
5. Authorize Vercel to access your GitHub account
6. Find and select the **AgentLink** repository
7. Click **"Import"**

## Step 3: Configure Project Settings

### Framework Preset
Vercel should automatically detect your project settings:
- **Framework Preset:** Vite
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build` (should be auto-detected)
- **Output Directory:** `dist` (should be auto-detected)

### Advanced Build Settings
If needed, you can customize:
- **Install Command:** `npm install`
- **Build Command:** `npm run build`

## Step 4: Set Environment Variables

Click on **"Environment Variables"** and add the following:

### Required Variables

```env
# Database
DATABASE_URL=postgresql://your-database-connection-string

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Stripe (Get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Important Notes:
- **DATABASE_URL**: Use your production database connection string
- **JWT_SECRET**: Generate a strong random string (at least 32 characters)
  - You can generate one using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **STRIPE_SECRET_KEY**: Use your **live** key for production (starts with `sk_live_`)
- **VITE_STRIPE_PUBLIC_KEY**: Use your **live** publishable key (starts with `pk_live_`)

### For Testing/Staging Deployments
If you want to test first, use your Stripe **test** keys:
- `sk_test_...` for STRIPE_SECRET_KEY
- `pk_test_...` for VITE_STRIPE_PUBLIC_KEY

## Step 5: Configure vercel.json (Already in your project)

Make sure you have a `vercel.json` file in your project root. If not, create it:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/index.html"
    }
  ]
}
```

## Step 6: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (this may take 2-5 minutes)
3. Once deployed, Vercel will provide you with a URL like: `https://agent-link-xyz.vercel.app`

## Step 7: Run Database Migrations

After your first deployment, you need to run the database migrations:

### Option 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Run migration
vercel env pull .env.production
npm run db:push
```

### Option 2: Using a Temporary Build

1. In your Vercel project dashboard, go to **Settings → General**
2. Scroll to **Build & Development Settings**
3. Add a temporary **Install Command**:
   ```bash
   npm install && npm run db:push
   ```
4. Trigger a new deployment
5. After successful migration, **remove** the `npm run db:push` from the install command

### Option 3: Local Migration (If you have database access)

```bash
# Set your production DATABASE_URL locally
export DATABASE_URL="postgresql://your-production-db-url"

# Run migration
npm run db:push
```

## Step 8: Configure Custom Domain (Optional)

1. In your Vercel project, go to **Settings → Domains**
2. Add your custom domain (e.g., `agentlink.com`)
3. Follow Vercel's instructions to configure DNS records
4. Vercel will automatically provision SSL certificates

## Step 9: Post-Deployment Checklist

- [ ] Test user registration and login
- [ ] Test job creation with address geocoding
- [ ] Verify map displays jobs correctly
- [ ] Test Stripe payment flow (use test mode first!)
- [ ] Check WebSocket connections for real-time chat
- [ ] Verify GPS check-in/check-out functionality
- [ ] Test admin functions (license approval)

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Commits to `main` branch → `your-app.vercel.app`
- **Preview**: Pull requests → Unique preview URLs

Every push to GitHub triggers a new deployment!

## Troubleshooting

### Build Fails with "Cannot find module"
- Ensure all dependencies are in `package.json`
- Check that `node_modules` is in `.gitignore`

### Database Connection Errors
- Verify `DATABASE_URL` is set correctly
- Ensure SSL mode is enabled (add `?sslmode=require` to connection string)
- Check if your database allows connections from Vercel's IP ranges

### Environment Variables Not Working
- Make sure variables are set in Vercel dashboard
- Variables prefixed with `VITE_` are for client-side code
- Redeploy after adding/changing environment variables

### WebSocket Issues
- WebSockets work differently on serverless
- Consider using a managed WebSocket service like Pusher or Ably
- Or deploy the WebSocket server separately (e.g., on Railway)

### Geocoding Not Working
- The OpenStreetMap Nominatim API has rate limits
- Consider using a paid geocoding service for production (Google Maps, Mapbox)
- Add error handling for failed geocoding requests

## Alternative Deployment: Vercel + Separate WebSocket Server

Since Vercel is serverless and may have limitations with WebSockets:

1. **Deploy main app to Vercel** (follow steps above)
2. **Deploy WebSocket server separately** to Railway/Render:
   - Create a new repository with just the WebSocket server code
   - Deploy to Railway: https://railway.app
   - Update your client to connect to the separate WebSocket URL

## Monitoring and Logs

- **View Logs**: Vercel Dashboard → Your Project → Deployments → Click deployment → View Logs
- **Runtime Logs**: Vercel Dashboard → Your Project → Logs
- **Analytics**: Enable Vercel Analytics in project settings

## Scaling Considerations

- Vercel's free tier includes:
  - 100GB bandwidth/month
  - Unlimited deployments
  - Automatic HTTPS

- For production with high traffic:
  - Consider Vercel Pro ($20/month)
  - Use a connection pooler for PostgreSQL (PgBouncer)
  - Implement caching strategies
  - Consider CDN for static assets

## Security Best Practices

1. **Never commit secrets** - Use Vercel environment variables
2. **Use different databases** for development/production
3. **Enable Vercel's security features**:
   - Deployment Protection
   - Password Protection (for staging)
4. **Regularly update dependencies**: `npm audit fix`
5. **Use Vercel's Web Application Firewall** (available on Pro plans)

## Support

- Vercel Documentation: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
- AgentLink Issues: https://github.com/Axionautomation/AgentLink/issues

---

**Ready to deploy?** Follow the steps above and your AgentLink marketplace will be live in minutes! 🚀
