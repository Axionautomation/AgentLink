-- Complete Database Reset Script
-- This will DELETE ALL DATA and recreate tables from scratch
-- ⚠️ WARNING: This is irreversible!

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Confirm all tables are gone
SELECT 'All tables dropped successfully' as status;

-- Now you need to run: npm run db:push
-- This will recreate all tables from your Drizzle schema
