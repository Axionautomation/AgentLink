import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import {
  authenticateToken,
  hashPassword,
  comparePassword,
  generateToken,
  isValidEmail,
  isValidPassword,
  type AuthRequest
} from "./auth";
import { insertJobSchema, insertMessageSchema, insertReviewSchema } from "@shared/schema";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

// Admin authorization middleware
const isAdmin = async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.userId;
    const user = await storage.getUser(userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Authorization check failed" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== Auth Routes ====================

  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await storage.upsertUser({
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
      });

      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ message: error.message || 'Registration failed' });
    }
  });

  // Login user
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Compare password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          licenseVerified: user.licenseVerified,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ message: error.message || 'Login failed' });
    }
  });

  // Get current user
  app.get('/api/auth/user', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update user license
  app.patch('/api/auth/user/license', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { licenseNumber, licenseState, licenseDocumentUrl } = req.body;
      
      // Validate required fields
      if (!licenseNumber || !licenseNumber.trim()) {
        return res.status(400).json({ message: "License number is required" });
      }
      if (!licenseState || !licenseState.trim()) {
        return res.status(400).json({ message: "License state is required" });
      }
      if (!licenseDocumentUrl || !licenseDocumentUrl.trim()) {
        return res.status(400).json({ message: "License document URL is required" });
      }
      
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Explicitly prevent isAdmin from being changed - preserve existing value
      const updatedUser = await storage.upsertUser({
        ...currentUser,
        licenseNumber: licenseNumber.trim(),
        licenseState: licenseState.trim(),
        licenseDocumentUrl: licenseDocumentUrl.trim(),
        licenseVerified: false,
        isAdmin: currentUser.isAdmin || false, // Preserve existing admin status
      });

      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Admin Routes ====================

  app.get('/api/admin/pending-licenses', authenticateToken, isAdmin, async (req: AuthRequest, res) => {
    try {
      const pendingUsers = await storage.getPendingLicenseUsers();
      res.json(pendingUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/admin/approve-license/:userId', authenticateToken, isAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const approvedUser = await storage.approveLicense(userId);
      if (!approvedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(approvedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Job Routes ====================
  
  // Get all open jobs (marketplace)
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      
      // Fetch poster info for each job
      const jobsWithPoster = await Promise.all(
        jobs.map(async (job) => {
          const poster = await storage.getUser(job.posterId);
          const claimer = job.claimerId ? await storage.getUser(job.claimerId) : null;
          return {
            ...job,
            poster,
            claimer,
            posterName: poster ? `${poster.firstName} ${poster.lastName}` : 'Unknown',
          };
        })
      );
      
      res.json(jobsWithPoster);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single job with details
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const poster = await storage.getUser(job.posterId);
      const claimer = job.claimerId ? await storage.getUser(job.claimerId) : null;

      res.json({
        ...job,
        poster,
        claimer,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create job
  app.post("/api/jobs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertJobSchema.parse(req.body);
      const userId = req.user!.userId;
      
      // Calculate platform fee (20%)
      const fee = parseFloat(validatedData.fee);
      const platformFee = fee * 0.20;
      const payoutAmount = fee - platformFee;
      
      // Create Stripe PaymentIntent for escrow
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(fee * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        capture_method: 'manual', // Escrow - we'll capture later
        metadata: {
          platformFee: platformFee.toFixed(2),
          payoutAmount: payoutAmount.toFixed(2),
        }
      });

      const job = await storage.createJob({
        ...validatedData,
        platformFee: platformFee.toFixed(2),
        payoutAmount: payoutAmount.toFixed(2),
        paymentIntentId: paymentIntent.id,
        escrowHeld: true,
      });

      // Record the escrow hold transaction
      await storage.createTransaction({
        jobId: job.id,
        payerId: userId,
        type: 'escrow_hold',
        amount: fee.toFixed(2),
        platformFee: platformFee.toFixed(2),
        netAmount: payoutAmount.toFixed(2),
        stripePaymentIntentId: paymentIntent.id,
        status: 'held',
      });

      res.json({ ...job, clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Claim job
  app.post("/api/jobs/:id/claim", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const job = await storage.claimJob(req.params.id, userId);
      
      if (!job) {
        return res.status(400).json({ message: "Job already claimed or not available" });
      }

      // Create notification for job poster
      await storage.createNotification({
        userId: job.posterId,
        type: 'job_claimed',
        title: 'Job Claimed',
        message: `Your job at ${job.propertyAddress} has been claimed`,
        jobId: job.id,
      });

      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GPS Check-in
  app.post("/api/jobs/:id/check-in", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { latitude, longitude } = req.body;
      const job = await storage.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify user is the claimer
      if (job.claimerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Validate property coordinates exist
      if (!job.propertyLat || !job.propertyLng) {
        return res.status(400).json({ message: "Job missing property coordinates" });
      }

      // Calculate distance from property (Haversine formula)
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 20902231; // Earth radius in feet
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const distance = calculateDistance(
        parseFloat(job.propertyLat),
        parseFloat(job.propertyLng),
        latitude,
        longitude
      );

      const verified = distance <= 200; // Within 200 feet

      // Record check-in
      await storage.createCheckIn({
        jobId: job.id,
        userId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        type: 'check_in',
        timestamp: new Date(),
        distanceFromProperty: distance.toFixed(2),
        verified,
      });

      const updated = await storage.updateJob(req.params.id, {
        claimerCheckedIn: verified,
        claimerCheckInTime: new Date(),
        status: verified ? 'in_progress' : job.status,
      });

      res.json({ ...updated, verified, distance: distance.toFixed(2) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GPS Check-out
  app.post("/api/jobs/:id/check-out", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { latitude, longitude } = req.body;
      const job = await storage.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.claimerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Validate property coordinates exist
      if (!job.propertyLat || !job.propertyLng) {
        return res.status(400).json({ message: "Job missing property coordinates" });
      }

      // Calculate distance from property
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 20902231;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const distance = calculateDistance(
        parseFloat(job.propertyLat),
        parseFloat(job.propertyLng),
        latitude,
        longitude
      );

      const verified = distance <= 200;

      // Record check-out
      await storage.createCheckIn({
        jobId: job.id,
        userId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        type: 'check_out',
        timestamp: new Date(),
        distanceFromProperty: distance.toFixed(2),
        verified,
      });

      const updated = await storage.updateJob(req.params.id, {
        claimerCheckedOut: verified,
        claimerCheckOutTime: new Date(),
      });

      // Notify job poster
      await storage.createNotification({
        userId: job.posterId,
        type: 'job_reminder',
        title: 'Agent Checked Out',
        message: `Agent has completed the job at ${job.propertyAddress}`,
        jobId: job.id,
      });

      res.json({ ...updated, verified, distance: distance.toFixed(2) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Complete job and release payment
  app.post("/api/jobs/:id/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const job = await storage.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.posterId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!job.paymentIntentId) {
        return res.status(400).json({ message: "No payment intent found" });
      }

      // Capture the payment (release from escrow) with platform fee
      const captured = await stripe.paymentIntents.capture(job.paymentIntentId);

      // Record escrow release transaction
      await storage.createTransaction({
        jobId: job.id,
        payerId: job.posterId,
        payeeId: job.claimerId || undefined,
        type: 'escrow_release',
        amount: job.fee,
        platformFee: job.platformFee || '0',
        netAmount: job.payoutAmount || job.fee,
        stripePaymentIntentId: job.paymentIntentId,
        status: 'completed',
      });

      // Record platform fee transaction
      await storage.createTransaction({
        jobId: job.id,
        payerId: job.posterId,
        type: 'platform_fee',
        amount: job.platformFee || '0',
        stripePaymentIntentId: job.paymentIntentId,
        status: 'completed',
      });

      const updated = await storage.updateJob(req.params.id, {
        status: 'completed',
        paymentReleased: true,
      });

      // Update agent stats
      if (job.claimerId) {
        const claimer = await storage.getUser(job.claimerId);
        if (claimer) {
          await storage.upsertUser({
            ...claimer,
            totalJobs: (claimer.totalJobs || 0) + 1,
            completedJobs: (claimer.completedJobs || 0) + 1,
          });
        }
      }

      // Notify claimer of payment
      if (job.claimerId) {
        await storage.createNotification({
          userId: job.claimerId,
          type: 'payment_received',
          title: 'Payment Received',
          message: `You've received $${job.payoutAmount} for the job at ${job.propertyAddress}`,
          jobId: job.id,
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get my posted jobs
  app.get("/api/my-jobs/posted", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const jobs = await storage.getMyPostedJobs(userId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get my claimed jobs
  app.get("/api/my-jobs/claimed", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const jobs = await storage.getMyClaimedJobs(userId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Message Routes ====================
  
  // Get messages for a job
  app.get("/api/jobs/:jobId/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const messages = await storage.getJobMessages(req.params.jobId);
      
      // Fetch sender info for each message
      const messagesWithSender = await Promise.all(
        messages.map(async (msg) => {
          const sender = await storage.getUser(msg.senderId);
          return { ...msg, sender };
        })
      );
      
      res.json(messagesWithSender);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send message
  app.post("/api/jobs/:jobId/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      
      // Broadcast to all connected WebSocket clients immediately
      const wss = app.locals.wss;
      if (wss) {
        const broadcast = JSON.stringify({
          type: 'new_message',
          jobId: req.params.jobId,
          userId: validatedData.senderId,
        });
        
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }
      
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Review Routes ====================
  
  // Submit review
  app.post("/api/jobs/:jobId/review", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(validatedData);
      res.json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Notification Routes ====================
  
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/:id/mark-read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Transaction Routes ====================
  
  app.get("/api/transactions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Payment Routes ====================
  
  app.post("/api/create-payment-intent", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Bank Account & Withdrawal Routes ====================
  
  // Create Financial Connections Session for bank linking
  app.post("/api/create-financial-connections-session", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        });
        customerId = customer.id;
        await storage.upsertUser({
          ...user,
          stripeCustomerId: customerId,
        });
      }

      // Create Financial Connections Session
      const session = await stripe.financialConnections.sessions.create({
        account_holder: {
          type: 'customer',
          customer: customerId,
        },
        permissions: ['payment_method', 'balances'],
        filters: {
          countries: ['US'],
        },
      });

      res.json({ clientSecret: session.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Link bank account after Financial Connections Session
  app.post("/api/link-bank-account", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { accountId } = req.body; // Financial Connections Account ID
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Retrieve the Financial Connections Account to get bank details
      const fcAccount = await stripe.financialConnections.accounts.retrieve(accountId);
      
      // Update user with bank account info
      await storage.upsertUser({
        ...user,
        stripeFinancialConnectionsAccountId: accountId,
        bankAccountLast4: fcAccount.last4 || '',
        bankName: fcAccount.institution_name || '',
      });

      res.json({ 
        success: true,
        bankName: fcAccount.institution_name,
        last4: fcAccount.last4,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create instant payout/withdrawal
  app.post("/api/create-payout", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { amount } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeFinancialConnectionsAccountId) {
        return res.status(400).json({ message: "No bank account linked. Please link a bank account first." });
      }

      // Get user's available balance (escrow releases minus payouts)
      const transactions = await storage.getUserTransactions(userId);
      const escrowReleased = transactions
        .filter(t => t.type === 'escrow_release' && t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const previousPayouts = transactions
        .filter(t => t.type === 'payout' && t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const availableBalance = escrowReleased - previousPayouts;

      const requestedAmount = parseFloat(amount);
      if (requestedAmount > availableBalance || requestedAmount <= 0) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // For MVP: Create a transaction record (actual payout would require Stripe Connect)
      // In production, you would use stripe.payouts.create() with a Connect account
      await storage.createTransaction({
        payerId: userId,
        type: 'payout',
        amount: requestedAmount.toFixed(2),
        status: 'completed',
        stripePaymentIntentId: `payout_${Date.now()}`, // Mock for MVP
        description: `Withdrawal to ${user.bankName} (****${user.bankAccountLast4})`,
      });

      res.json({ 
        success: true,
        amount: requestedAmount,
        bankName: user.bankName,
        last4: user.bankAccountLast4,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== WebSocket Server ====================
  
  const httpServer = createServer(app);
  
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store WebSocket server in app.locals for access in routes
  app.locals.wss = wss;
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (data: string) => {
      // Broadcast message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
