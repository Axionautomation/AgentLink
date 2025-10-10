import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== Auth Tables (Required for Replit Auth) ====================

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - extended for AgentLink with custom auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // AgentLink specific fields
  licenseNumber: varchar("license_number"),
  licenseState: varchar("license_state"),
  licenseVerified: boolean("license_verified").default(false),
  licenseDocumentUrl: varchar("license_document_url"), // For manual verification
  brokerage: varchar("brokerage"),
  bio: text("bio"),
  phone: varchar("phone"),
  
  // Statistics
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalJobs: integer("total_jobs").default(0),
  completedJobs: integer("completed_jobs").default(0),
  
  // Stripe fields for payments
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeAccountId: varchar("stripe_account_id"), // For Connect payouts
  stripeFinancialConnectionsAccountId: varchar("stripe_financial_connections_account_id"), // For bank linking
  stripeExternalAccountId: varchar("stripe_external_account_id"), // For payouts
  bankAccountLast4: varchar("bank_account_last4"),
  bankName: varchar("bank_name"),
  
  // Admin access
  isAdmin: boolean("is_admin").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ==================== Job Tables ====================

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Job poster (listing agent)
  posterId: varchar("poster_id").notNull().references(() => users.id),
  
  // Job claimer (covering agent)
  claimerId: varchar("claimer_id").references(() => users.id),
  
  // Property details
  propertyAddress: text("property_address").notNull(), // Full formatted address for display
  addressLine1: varchar("address_line_1"),
  addressLine2: varchar("address_line_2"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  propertyLat: decimal("property_lat", { precision: 10, scale: 7 }),
  propertyLng: decimal("property_lng", { precision: 10, scale: 7 }),
  propertyType: varchar("property_type").notNull(), // 'showing' | 'open_house'
  
  // Job details
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time").notNull(), // e.g., "2:00 PM - 4:00 PM"
  duration: integer("duration").notNull(), // in minutes
  description: text("description"),
  specialInstructions: text("special_instructions"),
  
  // Payment
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }), // 20% default
  payoutAmount: decimal("payout_amount", { precision: 10, scale: 2 }), // fee - platformFee
  
  // Status tracking
  status: varchar("status").notNull().default("open"), // 'open' | 'claimed' | 'in_progress' | 'completed' | 'cancelled'
  
  // GPS verification
  posterCheckedIn: boolean("poster_checked_in").default(false),
  posterCheckInTime: timestamp("poster_check_in_time"),
  claimerCheckedIn: boolean("claimer_checked_in").default(false),
  claimerCheckInTime: timestamp("claimer_check_in_time"),
  claimerCheckedOut: boolean("claimer_checked_out").default(false),
  claimerCheckOutTime: timestamp("claimer_check_out_time"),
  
  // Payment tracking
  paymentIntentId: varchar("payment_intent_id"), // Stripe PaymentIntent ID
  escrowHeld: boolean("escrow_held").default(false),
  paymentReleased: boolean("payment_released").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("jobs_poster_id_idx").on(table.posterId),
  index("jobs_claimer_id_idx").on(table.claimerId),
  index("jobs_status_idx").on(table.status),
]);

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  claimerId: true,
  posterCheckedIn: true,
  posterCheckInTime: true,
  claimerCheckedIn: true,
  claimerCheckInTime: true,
  claimerCheckedOut: true,
  claimerCheckOutTime: true,
  paymentIntentId: true,
  escrowHeld: true,
  paymentReleased: true,
  platformFee: true,
  payoutAmount: true,
}).extend({
  scheduledDate: z.string(),
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ==================== Messages/Chat Tables ====================

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  fileUrl: varchar("file_url"), // For photo/file uploads
  isSystemMessage: boolean("is_system_message").default(false), // For auto-generated messages
  readByRecipient: boolean("read_by_recipient").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("messages_job_id_idx").on(table.jobId),
  index("messages_sender_id_idx").on(table.senderId),
]);

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readByRecipient: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ==================== Reviews/Ratings Tables ====================

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id).unique(),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id),
  
  rating: integer("rating").notNull(), // 1-5 stars
  
  // Quick feedback categories
  communication: boolean("communication").default(false),
  professionalism: boolean("professionalism").default(false),
  punctuality: boolean("punctuality").default(false),
  
  comment: text("comment"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("reviews_reviewee_id_idx").on(table.revieweeId),
]);

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// ==================== Notifications Tables ====================

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'job_claimed' | 'job_posted' | 'payment_received' | 'job_reminder' | 'message'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  jobId: varchar("job_id").references(() => jobs.id),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_read_idx").on(table.read),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ==================== Transactions Tables ====================

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id),
  payerId: varchar("payer_id").references(() => users.id), // Job poster
  payeeId: varchar("payee_id").references(() => users.id), // Job claimer

  // Transaction details
  type: varchar("type").notNull(), // 'escrow_hold' | 'escrow_release' | 'platform_fee' | 'refund' | 'payout'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }),
  description: text("description"),

  // Stripe details
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeTransferId: varchar("stripe_transfer_id"),
  status: varchar("status").notNull(), // 'pending' | 'held' | 'completed' | 'failed' | 'refunded'

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("transactions_job_id_idx").on(table.jobId),
  index("transactions_payer_id_idx").on(table.payerId),
  index("transactions_payee_id_idx").on(table.payeeId),
]);

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ==================== GPS Check-ins Tables ====================

export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // GPS coordinates
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  
  // Check-in details
  type: varchar("type").notNull(), // 'check_in' | 'check_out'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  distanceFromProperty: decimal("distance_from_property", { precision: 10, scale: 2 }), // in feet
  verified: boolean("verified").default(false), // Within 200ft radius
  
  // Device info for verification
  deviceId: varchar("device_id"),
  ipAddress: varchar("ip_address"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("check_ins_job_id_idx").on(table.jobId),
  index("check_ins_user_id_idx").on(table.userId),
]);

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  createdAt: true,
  verified: true,
});

export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;
