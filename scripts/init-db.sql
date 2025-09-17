-- Initialization script for max_system database
-- This script sets up the database with proper extensions and initial configuration

-- Create database if it doesn't exist (this will be handled by Docker)
-- CREATE DATABASE max_system;

-- Connect to the database
\c max_system;

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable unaccent extension for accent-insensitive searches
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create indexes for better performance (will be created by Alembic migrations)
-- These are just placeholders for reference

-- Set timezone
SET timezone = 'America/Sao_Paulo';

-- Create initial admin user (will be handled by application)
-- This is just a placeholder for reference

COMMENT ON DATABASE max_system IS 'Advocacia Direta - Sistema de Gestão Jurídica com WhatsApp';

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE max_system TO postgres;

-- Log successful initialization
SELECT 'Database max_system initialized successfully' AS status;