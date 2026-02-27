-- Add comision_percent to agent_fixed_costs (manual comision % per agent per month)
-- Run with: psql $DATABASE_URL -f scripts/migration_add_comision_percent_agent_fixed_costs.sql
ALTER TABLE agent_fixed_costs
  ADD COLUMN IF NOT EXISTS comision_percent DECIMAL(5,2) DEFAULT 0;
