-- Migration: Add new client sources, status, and criteriu number field
-- Date: 2026-01-26

-- Add new values to client_source enum
ALTER TYPE client_source ADD VALUE IF NOT EXISTS 'OLX';
ALTER TYPE client_source ADD VALUE IF NOT EXISTS 'TELEFON';

-- Add new value to offer_status enum
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'INFORMATII';

-- Add numCriteriu column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS num_criteriu INTEGER;

-- Create index for faster lookups on numCriteriu for Alexandru Croitoru
CREATE INDEX IF NOT EXISTS idx_clients_num_criteriu ON clients(agent_id, num_criteriu) WHERE num_criteriu IS NOT NULL;
