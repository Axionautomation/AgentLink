# Stripe Test Mode → Live Mode Migration Guide

## Overview

Your AgentLink app is designed to work in both Stripe test and live modes. The code automatically adapts based on your environment variables.

**What you're switching**:
- Test keys → Live keys
- Test data → Live data
- Fake payments → Real payments

---

## Prerequisites

✅ **Before switching to live mode, ensure**:

1. **Stripe Account**: Your Stripe account is fully activated for live payments
2. **Business Verification**: Stripe has verified your business details
3. **Tax Settings**: Tax information configured in Stripe dashboard
4. **Terms of Service**: Stripe Connect platform agreement accepted
5. **Testing**: All payment flows tested thoroughly in test mode
6. **Backup**: Database backup taken (just in case!)

---

## Quick Migration (Recommended)

### Step 1: Clear Test Data

**Option A - Using Admin API**:
```bash
curl -X POST https://your-app.onrender.com/api/admin/clear-all-stripe-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"secretCode": "RESET_STRIPE_2024"}'
```

**Option B - Using SQL**:
```bash
# Connect to your Render database
psql $DATABASE_URL

# Run cleanup
UPDATE users SET
  stripe_customer_id = NULL,
  stripe_account_id = NULL,
  stripe_financial_connections_account_id = NULL,
  stripe_external_account_id = NULL,
  bank_account_last4 = NULL,
  bank_name = NULL;

UPDATE jobs SET payment_intent_id = NULL;
UPDATE transactions SET stripe_payment_intent_id = NULL, stripe_transfer_id = NULL;
```

**Option C - Using Migration Script (Preserves History)**:
```bash
node migrate_to_live.js
```

### Step 2: Update Environment Variables

**On Render**:
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service
3. Go to "Environment" tab
4. Update these variables:

| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_51...` | `sk_live_51...` |
| `VITE_STRIPE_PUBLIC_KEY` | `pk_test_51...` | `pk_live_51...` |

5. Click "Save Changes"

**Locally** (`.env` file):
```bash
# Update your .env file
STRIPE_SECRET_KEY=sk_live_51...
VITE_STRIPE_PUBLIC_KEY=pk_live_51...
```

### Step 3: Deploy

Render will **automatically redeploy** when you save environment variables.

Or manually push:
```bash
git commit --allow-empty -m "Switch to Stripe live mode"
git push origin main
```

### Step 4: Verify

Run the diagnostic script:
```bash
node diagnose_stripe.js
```

Expected output:
```
=== STRIPE CONFIGURATION DIAGNOSTIC ===

1. ENVIRONMENT VARIABLES:
   STRIPE_SECRET_KEY: sk_live_51...
   Key Type: ❌ LIVE MODE
   VITE_STRIPE_PUBLIC_KEY: pk_live_51...
   Key Type: ❌ LIVE MODE

2. DATABASE STRIPE CUSTOMER IDS:
   Found 0 users with Stripe customer IDs

   ❌ LIVE MODE customers: 0
   ✅ TEST MODE customers: 0

✅ All good! Ready for live mode.
```

### Step 5: Test with Real Payment

⚠️ **Important**: Test with a real payment before announcing to users!

**Use these live test cards** (they work in live mode but don't create real charges):
```
Card: 4242 4242 4242 4242
Exp: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

**Steps**:
1. Create a test job
2. Connect Stripe account (will create real Express account)
3. Claim the job
4. Make payment with test card above
5. Verify payment appears in your Stripe Dashboard
6. Check agent's Stripe Connect account has funds

---

## Advanced Migration (Preserve History)

If you want to keep test data for reference:

### Step 1: Run Migration Script

```bash
node migrate_to_live.js
```

This will:
- Archive test Stripe IDs to `*_test` columns
- Clear active Stripe IDs
- Flag test jobs with `is_test_mode = true`
- Preserve all historical data

### Step 2: Update Environment Variables

Same as Quick Migration Step 2

### Step 3: Deploy

Same as Quick Migration Step 3

### Benefits:
- ✅ Historical test payments preserved
- ✅ Can analyze test data later
- ✅ Audit trail maintained
- ✅ Can identify test vs live transactions

### Drawbacks:
- ⚠️ More complex database schema
- ⚠️ Need to filter test data in reports

---

## What Happens After Migration

### For Existing Users:

1. **Stripe Connect** (Agents):
   - Old test accounts **won't work**
   - Must click "Connect Stripe Account" again
   - Creates new **live mode** Express account
   - Must complete Stripe onboarding again (5 mins)

2. **Payment Customers** (Job Posters):
   - Old test customer IDs cleared
   - New live customer created automatically on first payment
   - No action required from users

### For New Jobs:

1. User claims job
2. System checks for `stripeAccountId`
3. If null → Prompt to connect Stripe
4. User connects → Live Express account created
5. Payment collected → Real money transferred!

---

## Monitoring After Migration

### Day 1 Checklist:

- [ ] Run `node diagnose_stripe.js` → Verify live mode
- [ ] Check Stripe Dashboard → See live payments
- [ ] Test payment flow end-to-end
- [ ] Verify platform fee (10%) collected
- [ ] Verify agent payout (90%) transferred
- [ ] Check transaction records in database
- [ ] Monitor error logs for Stripe API errors

### Week 1 Checklist:

- [ ] All active agents reconnected Stripe
- [ ] No test mode errors in logs
- [ ] Payment success rate > 95%
- [ ] Payouts processing correctly
- [ ] No stuck escrow payments
- [ ] Customer support tickets minimal

---

## Troubleshooting

### Problem: "No such customer: cus_test_..."

**Cause**: Database still has test customer IDs but app is in live mode

**Fix**:
```sql
UPDATE users SET stripe_customer_id = NULL;
```

Then retry payment - new live customer will be created.

---

### Problem: "No such account: acct_test_..."

**Cause**: Agent's Stripe account ID is from test mode

**Fix**:
1. Go to Profile page
2. Click "Connect Stripe Account"
3. Complete onboarding
4. New live account created

---

### Problem: Payments not appearing in Stripe Dashboard

**Check**:
1. Dashboard is in **Live mode** (toggle in top left)
2. Environment variables are `sk_live_...` and `pk_live_...`
3. Browser cache cleared
4. Using correct Stripe account

---

### Problem: "Platform fees not being collected"

**Cause**: Destination charge not configured properly

**Check** (`server/routes.ts:549-552`):
```typescript
payment_intent_data: {
  application_fee_amount: platformFeeAmount, // Must be 10% in cents
  transfer_data: {
    destination: claimer.stripeAccountId, // Must be live account
  },
},
```

---

## Rollback Plan

If something goes wrong:

### Step 1: Switch back to test keys

```bash
# In Render Dashboard
STRIPE_SECRET_KEY=sk_test_51...
VITE_STRIPE_PUBLIC_KEY=pk_test_51...
```

### Step 2: Restore test data (if using migration script)

```sql
-- Restore test Stripe IDs
UPDATE users SET
  stripe_customer_id = stripe_customer_id_test,
  stripe_account_id = stripe_account_id_test
WHERE stripe_customer_id_test IS NOT NULL;
```

### Step 3: Redeploy

App will work in test mode again.

---

## Cost Considerations

### Test Mode (Free):
- ✅ Unlimited test payments
- ✅ Test Connect accounts
- ✅ No fees

### Live Mode (Costs):
- **Stripe Fees**: 2.9% + 30¢ per transaction
- **Connect Fees**: +2% for Connect payments (total ~4.9%)
- **Payout Fees**: Free for standard payouts (2-7 days)
- **Platform Fees**: You keep 10% of each job fee

**Example Job ($100 fee)**:
```
Job Fee:           $100.00
Stripe Fee:        - $4.90  (2.9% + 30¢ + 2% Connect)
Net Amount:        $95.10

Your Platform:     $9.51   (10% of net)
Agent Payout:      $85.59  (90% of net)
```

⚠️ **Note**: You're currently taking the platform fee from the gross amount, not accounting for Stripe fees. You might want to adjust this:

**Current** (server/routes.ts:524-526):
```typescript
const platformFeeAmount = Math.round(fee * 0.10 * 100); // 10% of gross
```

**Suggested**:
```typescript
// Account for Stripe fees in your calculations
const totalAmount = Math.round(fee * 100);
const stripeFee = Math.round(totalAmount * 0.029 + 30); // 2.9% + 30¢
const netAfterStripe = totalAmount - stripeFee;
const platformFeeAmount = Math.round(netAfterStripe * 0.10); // 10% of net
```

---

## Best Practices

### DO:
✅ Test thoroughly in test mode first
✅ Backup database before migration
✅ Clear test data before switching
✅ Verify live payments with test cards
✅ Monitor Stripe Dashboard daily (first week)
✅ Set up Stripe webhooks (recommended)
✅ Enable Stripe email receipts
✅ Configure payout schedule (daily/weekly)

### DON'T:
❌ Switch to live mode without testing
❌ Mix test and live mode data
❌ Use live keys in development
❌ Forget to clear test Stripe IDs
❌ Skip the diagnostic script check
❌ Deploy on Friday (in case issues arise)

---

## Support

### If Issues Arise:

1. **Check Stripe Dashboard**: Logs → Events → Filter by error
2. **Run Diagnostic**: `node diagnose_stripe.js`
3. **Check Server Logs**: Render Dashboard → Logs
4. **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
5. **Documentation**: [https://stripe.com/docs/connect](https://stripe.com/docs/connect)

---

## Summary

**Test → Live migration is straightforward**:
1. Clear test Stripe data
2. Update environment variables
3. Redeploy
4. Users reconnect Stripe accounts
5. Monitor and verify

**Total time**: ~30 minutes
**User impact**: Must reconnect Stripe (one-time, 5 mins)
**Risk**: Low (can rollback anytime)

**You're ready when**:
- ✅ All features tested in test mode
- ✅ Payment flow working end-to-end
- ✅ GPS verification tested
- ✅ Dispute process documented
- ✅ Customer support ready
- ✅ Database backed up
- ✅ Stripe account verified

---

Good luck with your launch! 🚀
