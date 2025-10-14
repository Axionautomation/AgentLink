-- Clear all Stripe customer IDs so they can be recreated with test keys
UPDATE users SET stripe_customer_id = NULL;

SELECT 
  id, 
  email, 
  first_name, 
  last_name,
  stripe_customer_id
FROM users 
LIMIT 5;
