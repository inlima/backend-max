-- Database initialization script for production
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- Create user if it doesn't exist (handled by POSTGRES_USER env var)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
-- These will be created by Alembic migrations, but we ensure they exist

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE advocacia_direta TO advocacia_user;

-- Set timezone
SET timezone = 'America/Sao_Paulo';