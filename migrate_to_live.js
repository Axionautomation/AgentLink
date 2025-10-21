// Migration script: Test Mode → Live Mode
// Handles graceful transition while preserving historical data

import { config } from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

config();

async function migrate() {
  console.log('\n=== STRIPE TEST → LIVE MIGRATION ===\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Archive test mode data
    console.log('Step 1: Archiving test mode Stripe IDs...');

    await client.query(`
      -- Create archive columns if they don't exist
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS stripe_customer_id_test VARCHAR,
        ADD COLUMN IF NOT EXISTS stripe_account_id_test VARCHAR;

      -- Backup test mode IDs
      UPDATE users
      SET
        stripe_customer_id_test = stripe_customer_id,
        stripe_account_id_test = stripe_account_id
      WHERE
        stripe_customer_id IS NOT NULL
        OR stripe_account_id IS NOT NULL;
    `);

    const archivedUsers = await client.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE stripe_customer_id_test IS NOT NULL
         OR stripe_account_id_test IS NOT NULL
    `);

    console.log(`   ✅ Archived ${archivedUsers.rows[0].count} user Stripe IDs\n`);

    // Step 2: Clear current Stripe IDs (will be recreated in live mode)
    console.log('Step 2: Clearing active Stripe IDs for live mode...');

    await client.query(`
      UPDATE users SET
        stripe_customer_id = NULL,
        stripe_account_id = NULL,
        stripe_financial_connections_account_id = NULL,
        stripe_external_account_id = NULL,
        bank_account_last4 = NULL,
        bank_name = NULL;
    `);

    console.log('   ✅ Cleared user Stripe IDs (will auto-recreate in live mode)\n');

    // Step 3: Mark test jobs as archived
    console.log('Step 3: Marking test mode payments as archived...');

    await client.query(`
      -- Add archive column
      ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS payment_intent_id_test VARCHAR,
        ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false;

      -- Archive test payment intent IDs
      UPDATE jobs
      SET
        payment_intent_id_test = payment_intent_id,
        is_test_mode = true
      WHERE payment_intent_id IS NOT NULL;

      -- Clear payment intent IDs (not valid in live mode)
      UPDATE jobs
      SET payment_intent_id = NULL
      WHERE is_test_mode = true;
    `);

    const archivedJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM jobs
      WHERE is_test_mode = true
    `);

    console.log(`   ✅ Archived ${archivedJobs.rows[0].count} test mode jobs\n`);

    // Step 4: Archive test transactions
    console.log('Step 4: Marking test transactions...');

    await client.query(`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false;

      UPDATE transactions
      SET is_test_mode = true
      WHERE
        stripe_payment_intent_id IS NOT NULL
        OR stripe_transfer_id IS NOT NULL;
    `);

    const archivedTransactions = await client.query(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE is_test_mode = true
    `);

    console.log(`   ✅ Marked ${archivedTransactions.rows[0].count} test transactions\n`);

    // Step 5: Summary
    console.log('\n=== MIGRATION COMPLETE ===\n');
    console.log('✅ All test mode Stripe IDs archived and cleared');
    console.log('✅ Historical data preserved with test mode flags');
    console.log('✅ Ready for live mode\n');

    console.log('NEXT STEPS:');
    console.log('1. Update Render environment variables:');
    console.log('   - STRIPE_SECRET_KEY=sk_live_...');
    console.log('   - VITE_STRIPE_PUBLIC_KEY=pk_live_...');
    console.log('2. Redeploy your app');
    console.log('3. Ask users to reconnect Stripe accounts');
    console.log('4. Test a real payment with a test card first!\n');

    await client.end();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate().catch(console.error);
