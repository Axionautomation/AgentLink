// Comprehensive Stripe Configuration Diagnostic
// Run with: node diagnose_stripe.js

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;

config();

async function diagnose() {
  console.log('\n=== STRIPE CONFIGURATION DIAGNOSTIC ===\n');

  // 1. Check environment variables
  console.log('1. ENVIRONMENT VARIABLES:');
  console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY?.substring(0, 15) + '...');
  console.log('   Key Type:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? '✅ TEST MODE' : '❌ LIVE MODE');
  console.log('   VITE_STRIPE_PUBLIC_KEY:', process.env.VITE_STRIPE_PUBLIC_KEY?.substring(0, 15) + '...');
  console.log('   Key Type:', process.env.VITE_STRIPE_PUBLIC_KEY?.startsWith('pk_test_') ? '✅ TEST MODE' : '❌ LIVE MODE');
  console.log('');

  // 2. Check database for Stripe customer IDs
  console.log('2. DATABASE STRIPE CUSTOMER IDS:');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        id,
        email,
        stripe_customer_id,
        CASE
          WHEN stripe_customer_id LIKE 'cus_test_%' THEN 'TEST'
          WHEN stripe_customer_id LIKE 'cus_%' AND stripe_customer_id NOT LIKE 'cus_test_%' THEN 'LIVE'
          ELSE 'UNKNOWN'
        END as customer_mode
      FROM users
      WHERE stripe_customer_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`   Found ${result.rows.length} users with Stripe customer IDs:\n`);

    const liveCustomers = result.rows.filter(r => r.customer_mode === 'LIVE');
    const testCustomers = result.rows.filter(r => r.customer_mode === 'TEST');

    console.log(`   ❌ LIVE MODE customers: ${liveCustomers.length}`);
    console.log(`   ✅ TEST MODE customers: ${testCustomers.length}\n`);

    if (liveCustomers.length > 0) {
      console.log('   🚨 PROBLEM FOUND: Live mode customer IDs in database!');
      console.log('   These will cause errors when using test keys:\n');
      liveCustomers.forEach(c => {
        console.log(`      - ${c.email}: ${c.stripe_customer_id}`);
      });
      console.log('');
    }

    // 3. Check jobs for payment intents
    console.log('3. JOBS WITH PAYMENT DATA:');
    const jobsResult = await client.query(`
      SELECT
        id,
        payment_intent_id,
        escrow_held,
        status,
        CASE
          WHEN payment_intent_id LIKE 'pi_%' THEN 'PaymentIntent'
          WHEN payment_intent_id LIKE 'cs_%' THEN 'CheckoutSession'
          ELSE 'Unknown'
        END as payment_type
      FROM jobs
      WHERE payment_intent_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`   Found ${jobsResult.rows.length} jobs with payment data:\n`);
    jobsResult.rows.forEach(j => {
      console.log(`      Job ${j.id.substring(0, 8)}...`);
      console.log(`        Type: ${j.payment_type}`);
      console.log(`        ID: ${j.payment_intent_id?.substring(0, 20)}...`);
      console.log(`        Status: ${j.status}, Escrow: ${j.escrow_held}`);
      console.log('');
    });

    await client.end();

  } catch (error) {
    console.error('   ❌ Database error:', error.message);
  }

  // 4. Recommendations
  console.log('\n=== RECOMMENDATIONS ===\n');

  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
    console.log('❌ Your backend is using LIVE Stripe keys!');
    console.log('   Solution: Update .env and Render environment variables to use test keys');
    console.log('');
  }

  console.log('To fix live mode contamination, run:');
  console.log('   UPDATE users SET stripe_customer_id = NULL;');
  console.log('   UPDATE jobs SET payment_intent_id = NULL WHERE escrow_held = false;');
  console.log('');
}

diagnose().catch(console.error);
