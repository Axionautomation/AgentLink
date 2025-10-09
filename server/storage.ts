import {
  users,
  jobs,
  messages,
  reviews,
  notifications,
  transactions,
  checkIns,
  type User,
  type UpsertUser,
  type Job,
  type InsertJob,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Notification,
  type InsertNotification,
  type Transaction,
  type InsertTransaction,
  type CheckIn,
  type InsertCheckIn,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, isNotNull, sql } from "drizzle-orm";

// Interface for storage operations - includes Replit Auth requirements
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getPendingLicenseUsers(): Promise<User[]>;
  approveLicense(userId: string): Promise<User | undefined>;
  
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobs(): Promise<Job[]>;
  getMyPostedJobs(userId: string): Promise<Job[]>;
  getMyClaimedJobs(userId: string): Promise<Job[]>;
  updateJob(id: string, data: Partial<Job>): Promise<Job | undefined>;
  claimJob(jobId: string, claimerId: string): Promise<Job | undefined>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getJobMessages(jobId: string): Promise<Message[]>;
  
  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getUserReviews(userId: string): Promise<Review[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getJobTransactions(jobId: string): Promise<Transaction[]>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  
  // Check-in operations
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;
  getJobCheckIns(jobId: string): Promise<CheckIn[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Remove isAdmin from userData to prevent privilege escalation
    const { isAdmin: _, ...safeUserData } = userData as any;
    
    const [user] = await db
      .insert(users)
      .values(safeUserData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...safeUserData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getPendingLicenseUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.licenseVerified, false),
        isNotNull(users.licenseNumber)
      ));
  }

  async approveLicense(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ licenseVerified: true })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Job operations
  async createJob(jobData: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(jobData).returning();
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getMyPostedJobs(userId: string): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.posterId, userId))
      .orderBy(desc(jobs.createdAt));
  }

  async getMyClaimedJobs(userId: string): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.claimerId, userId))
      .orderBy(desc(jobs.createdAt));
  }

  async updateJob(id: string, data: Partial<Job>): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async claimJob(jobId: string, claimerId: string): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({
        claimerId,
        status: 'claimed',
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.status, 'open')))
      .returning();
    return job;
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getJobMessages(jobId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.jobId, jobId))
      .orderBy(messages.createdAt);
  }

  // Review operations
  async createReview(reviewData: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(reviewData).returning();
    
    // Update reviewee's rating
    const userReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.revieweeId, reviewData.revieweeId));
    
    const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
    
    await db
      .update(users)
      .set({ rating: avgRating.toFixed(2) })
      .where(eq(users.id, reviewData.revieweeId));
    
    return review;
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt));
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  // Transaction operations
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }

  async getJobTransactions(jobId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.jobId, jobId))
      .orderBy(desc(transactions.createdAt));
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(or(eq(transactions.fromUserId, userId), eq(transactions.toUserId, userId)))
      .orderBy(desc(transactions.createdAt));
  }

  // Check-in operations
  async createCheckIn(checkInData: InsertCheckIn): Promise<CheckIn> {
    const [checkIn] = await db.insert(checkIns).values(checkInData).returning();
    return checkIn;
  }

  async getJobCheckIns(jobId: string): Promise<CheckIn[]> {
    return await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.jobId, jobId))
      .orderBy(checkIns.timestamp);
  }
}

export const storage = new DatabaseStorage();
