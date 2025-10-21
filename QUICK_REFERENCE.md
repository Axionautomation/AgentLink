# Stripe Mode Quick Reference

## Current Mode Check
```bash
node diagnose_stripe.js
```

---

## Switch to Live Mode (3 Steps)

### 1. Clear Test Data
```bash
node migrate_to_live.js
```

### 2. Update Render Environment
```
Render Dashboard → Environment → Update:
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

### 3. Verify
```bash
node diagnose_stripe.js
# Should show: ✅ LIVE MODE
```

---

## Switch Back to Test Mode

### 1. Update Render Environment
```
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### 2. Clear Live Data (Optional)
```sql
UPDATE users SET stripe_customer_id = NULL, stripe_account_id = NULL;
```

---

## Common Issues

### Error: "No such customer: cus_..."
**Fix**: `UPDATE users SET stripe_customer_id = NULL;`

### Error: "No such account: acct_..."
**Fix**: User must reconnect Stripe in Profile page

### Mixed mode keys
**Fix**: Ensure both keys are test OR both are live

---

## Test Cards (Live Mode)

These work in live mode but don't create real charges:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

---

## Useful Commands

| Command | Purpose |
|---------|---------|
| `node diagnose_stripe.js` | Check current mode + issues |
| `node migrate_to_live.js` | Migrate test → live |
| `psql $DATABASE_URL -f clear_stripe_ids.sql` | Clear all Stripe IDs |

---

## Monitoring Checklist

**After going live**:
- [ ] Stripe Dashboard in Live mode
- [ ] First payment tested successfully
- [ ] Platform fee (10%) collected
- [ ] Agent payout (90%) transferred
- [ ] Transaction record created
- [ ] No errors in Render logs

---

## Support Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Render Dashboard](https://dashboard.render.com)
- [AgentLink Logs](https://dashboard.render.com → Logs)
