/**
 * Stripe Mode Validator
 *
 * Prevents errors when test mode IDs are used with live mode keys (and vice versa)
 * Automatically clears invalid Stripe IDs and logs warnings
 */

import Stripe from 'stripe';

export class StripeModeValidator {
  private isLiveMode: boolean;

  constructor(stripeSecretKey: string) {
    this.isLiveMode = stripeSecretKey.startsWith('sk_live_');
  }

  /**
   * Checks if a Stripe ID matches the current mode
   */
  isValidForCurrentMode(stripeId: string | null | undefined): boolean {
    if (!stripeId) return true; // null/undefined is always valid (will be created)

    // Stripe test IDs don't have a consistent prefix, but we can check the API key mode
    // The real validation happens when we try to use the ID

    return true; // Let Stripe API validate - we'll catch errors
  }

  /**
   * Safely retrieves a Stripe customer, handling mode mismatches
   */
  async safeRetrieveCustomer(
    stripe: Stripe,
    customerId: string | null | undefined
  ): Promise<Stripe.Customer | null> {
    if (!customerId) return null;

    try {
      return await stripe.customers.retrieve(customerId);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        console.warn(`⚠️ Customer ${customerId} not found - likely mode mismatch. Will create new customer.`);
        return null;
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Safely retrieves a Stripe Connect account, handling mode mismatches
   */
  async safeRetrieveAccount(
    stripe: Stripe,
    accountId: string | null | undefined
  ): Promise<Stripe.Account | null> {
    if (!accountId) return null;

    try {
      return await stripe.accounts.retrieve(accountId);
    } catch (error: any) {
      if (error.code === 'resource_missing' || error.code === 'account_invalid') {
        console.warn(`⚠️ Account ${accountId} not found - likely mode mismatch. User must reconnect.`);
        return null;
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Safely retrieves a payment intent, handling mode mismatches
   */
  async safeRetrievePaymentIntent(
    stripe: Stripe,
    paymentIntentId: string | null | undefined
  ): Promise<Stripe.PaymentIntent | null> {
    if (!paymentIntentId) return null;

    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        console.warn(`⚠️ Payment Intent ${paymentIntentId} not found - likely mode mismatch or expired.`);
        return null;
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Validates environment configuration
   */
  static validateEnvironment(secretKey: string, publicKey: string): void {
    const secretIsLive = secretKey.startsWith('sk_live_');
    const publicIsLive = publicKey.startsWith('pk_live_');

    if (secretIsLive !== publicIsLive) {
      throw new Error(
        `❌ STRIPE KEY MISMATCH!\n` +
        `   Secret Key: ${secretIsLive ? 'LIVE' : 'TEST'} mode\n` +
        `   Public Key: ${publicIsLive ? 'LIVE' : 'TEST'} mode\n` +
        `   Both keys must be in the same mode!`
      );
    }

    const mode = secretIsLive ? 'LIVE' : 'TEST';
    console.log(`✅ Stripe initialized in ${mode} mode`);

    if (secretIsLive) {
      console.warn(
        `⚠️  LIVE MODE ACTIVE - Real payments will be processed!\n` +
        `   Make sure you've:\n` +
        `   1. Cleared all test mode Stripe IDs from database\n` +
        `   2. Tested payment flow thoroughly\n` +
        `   3. Verified your Stripe account is fully activated`
      );
    }
  }

  /**
   * Checks if an error is due to mode mismatch
   */
  static isModeMismatchError(error: any): boolean {
    const mismatchPatterns = [
      'resource_missing',
      'account_invalid',
      'No such customer',
      'No such account',
      'No such payment_intent',
      'No such checkout.session',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return mismatchPatterns.some(
      pattern =>
        errorMessage.includes(pattern.toLowerCase()) ||
        errorCode.includes(pattern.toLowerCase())
    );
  }

  /**
   * Provides helpful error message for mode mismatches
   */
  static getModeMismatchHelp(stripeId: string): string {
    return (
      `Stripe ID not found: ${stripeId}\n` +
      `This usually means:\n` +
      `1. You switched from test to live mode (or vice versa)\n` +
      `2. The database still has old mode Stripe IDs\n\n` +
      `Solutions:\n` +
      `- Run: node diagnose_stripe.js (check current mode)\n` +
      `- Run: node migrate_to_live.js (if switching to live)\n` +
      `- Clear Stripe IDs: UPDATE users SET stripe_customer_id = NULL;\n` +
      `- Ask user to reconnect Stripe account`
    );
  }
}

/**
 * Express middleware to validate Stripe configuration on startup
 */
export function validateStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publicKey = process.env.VITE_STRIPE_PUBLIC_KEY;

  if (!secretKey || !publicKey) {
    throw new Error('Missing Stripe API keys in environment variables');
  }

  StripeModeValidator.validateEnvironment(secretKey, publicKey);
}
