-- Migration: Add FURNIZORI to client_source enum
-- Run this on your DB if you use PostgreSQL enum for client_source

ALTER TYPE client_source ADD VALUE IF NOT EXISTS 'FURNIZORI';
