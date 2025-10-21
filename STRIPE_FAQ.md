# Stripe Connect FAQ

## General Questions

### Q: Is my Stripe integration already set up?
**A**: Yes! You're using Stripe Connect with destination charges - the recommended approach for marketplaces.

### Q: What's the difference between test and live mode?
**A**:
- **Test Mode**: Fake payments, unlimited testing, no real money
- **Live Mode**: Real payments, real money, actual credit card charges

They're completely separate - test customers/payments don't exist in live mode.

---

## Migration Questions

### Q: How do I switch from test to live mode?
**A**: Three steps:
1. Run: `npm run stripe:migrate`
2. Update Render environment variables to use `sk_live_...` and `pk_live_...`
3. Redeploy

**Time**: ~30 minutes

### Q: Will I lose data when switching?
**A**:
- **Using `migrate_to_live.js`**: No, test data is archived
- **Manual clear**: Yes, test Stripe IDs are deleted (but your jobs/users remain)

Real data (job descriptions, user profiles, etc.) is never lost - only Stripe references.

### Q: Can I switch back to test mode?
**A**: Yes! Just update environment variables back to `sk_test_...` keys and redeploy.

### Q: What happens to my users when I switch?
**A**:
- Agents must reconnect Stripe (one-time, 5 minutes)
- Job posters: No action needed (new customer created automatically)

---

## Technical Questions

### Q: How does payment splitting work?
**A**: Using **destination charges**:
```
Job Fee: $100
├── Platform (you): $10 (10%)
└── Agent: $90 (90%)
```

Payment is collected from job poster and **automatically split** by Stripe - no manual transfers needed.

### Q: What are the Stripe fees?
**A**:
- Standard: 2.9% + 30¢ per transaction
- Connect: Additional 2% (total ~4.9% + 30¢)
- Payouts: Free (standard 2-7 day)

**Example** ($100 job):
```
Customer pays:     $100.00
Stripe takes:      $4.90
Net to split:      $95.10
Platform gets:     $9.51 (10%)
Agent gets:        $85.59 (90%)
```

### Q: When do agents get paid?
**A**: Immediately! With destination charges, funds are transferred to the agent's Stripe account as soon as payment is confirmed.

Agents can then withdraw to their bank (2-7 days for standard payout, or instant for 1.5% fee).

### Q: What if a job is cancelled after payment?
**A**: Currently no automatic refund. You should implement:
```typescript
const refund = await stripe.refunds.create({
  payment_intent: job.paymentIntentId,
  reverse_transfer: true, // Returns funds from agent's account
});
```

### Q: How do I test live mode without real charges?
**A**: Use Stripe test cards in live mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

These create real payment intents but no actual charges.

---

## Troubleshooting Questions

### Q: Error "No such customer: cus_xxx"
**A**: You have test mode customer IDs but switched to live mode.

**Fix**: `npm run stripe:clear` or manually:
```sql
UPDATE users SET stripe_customer_id = NULL;
```

### Q: Error "No such account: acct_xxx"
**A**: Agent's Stripe account is from wrong mode.

**Fix**: Agent must go to Profile → "Connect Stripe Account" again.

### Q: How do I check which mode I'm in?
**A**: Run `npm run stripe:check`

Shows:
- Current mode (test/live)
- Environment variables
- Database Stripe IDs
- Any mismatches

### Q: Payments not showing in Stripe Dashboard
**A**: Check:
1. Dashboard is in correct mode (toggle top-left)
2. Environment variables match (`sk_live_...` with live dashboard)
3. Using correct Stripe account
4. Browser cache cleared

### Q: Platform fees not being collected
**A**: Check `server/routes.ts:549-552`:
```typescript
payment_intent_data: {
  application_fee_amount: platformFeeAmount, // Must be set
  transfer_data: {
    destination: claimer.stripeAccountId, // Must be valid
  },
},
```

---

## Business Questions

### Q: How much does it cost to run?
**A**:
- **Development**: Free (test mode)
- **Production**: ~4.9% + 30¢ per transaction to Stripe
- You keep 10% of each job fee (minus Stripe fees)

### Q: Do I need a business to use Stripe Connect?
**A**: Yes, Stripe will verify your business during activation. Can be:
- LLC
- Corporation
- Sole proprietorship
- Individual (in some cases)

### Q: What are the legal requirements?
**A**: You must have:
- Terms of Service (for marketplace)
- Privacy Policy
- Stripe Connect Platform Agreement (signed during setup)
- Tax reporting (1099s for agents earning >$600/year)

### Q: How do I handle taxes?
**A**:
- Enable Stripe Tax: `automatic_tax: { enabled: true }`
- Agents are responsible for their own taxes
- You must send 1099 forms to agents (Stripe can help)

### Q: What about chargebacks/disputes?
**A**:
- Stripe handles dispute process
- You receive email notification
- Provide evidence within 7 days
- GPS check-in data can help prove service delivery

---

## Security Questions

### Q: Are my API keys safe?
**A**: Keys are in environment variables (not in code).

**NEVER**:
- Commit `.env` to git
- Share secret keys
- Use live keys in development
- Put keys in frontend code

### Q: How is payment data secured?
**A**:
- Stripe handles all PCI compliance
- Card numbers never touch your server
- Uses Stripe Elements (tokenization)
- HTTPS required in production

### Q: What if my Stripe key leaks?
**A**:
1. Immediately rotate key in Stripe Dashboard
2. Update environment variables
3. Redeploy app
4. Check Stripe Dashboard for suspicious activity

---

## Best Practices

### Q: Should I use test or live mode during development?
**A**: Always test mode until you're ready to launch.

### Q: When should I switch to live mode?
**A**: When:
- ✅ All features tested thoroughly
- ✅ Payment flow works end-to-end
- ✅ Terms of Service published
- ✅ Stripe account fully verified
- ✅ Database backed up
- ✅ Error monitoring set up

### Q: Should I add webhooks?
**A**: **Highly recommended!** Webhooks make payments more reliable:

```typescript
// Handle these events
- checkout.session.completed
- payment_intent.succeeded
- account.updated
- payment_intent.payment_failed
```

Without webhooks, if a user closes browser during payment, it might not be recorded.

### Q: How do I monitor payments?
**A**:
1. Stripe Dashboard → Payments (daily)
2. Server logs on Render
3. Database transaction records
4. Set up Stripe email alerts
5. Enable Stripe Radar (fraud detection)

---

## Quick Commands

```bash
# Check current mode
npm run stripe:check

# Migrate test → live
npm run stripe:migrate

# Clear all Stripe IDs
npm run stripe:clear

# View Stripe Dashboard
open https://dashboard.stripe.com

# View Render logs
open https://dashboard.render.com
```

---

## Need More Help?

**Documentation**:
- `STRIPE_MIGRATION_GUIDE.md` - Full migration guide
- `QUICK_REFERENCE.md` - Command cheat sheet
- `diagnose_stripe.js` - Diagnostic tool
- `migrate_to_live.js` - Migration script

**Stripe Resources**:
- [Connect Docs](https://stripe.com/docs/connect)
- [Destination Charges](https://stripe.com/docs/connect/destination-charges)
- [Testing](https://stripe.com/docs/testing)
- [Support](https://support.stripe.com)

**Tools**:
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Render Dashboard](https://dashboard.render.com)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (optional)
