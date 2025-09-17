#!/usr/bin/env python3
"""
Database setup script for max_system.
"""

import asyncio
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import create_async_engine
from app.core.database import Base
from app.config import settings
from scripts.seed_database import seed_database


async def create_tables():
    """Create all database tables."""
    print("🏗️  Creating database tables...")
    
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=True,
        future=True,
    )
    
    async with engine.begin() as conn:
        # Drop all tables first (for clean setup)
        await conn.run_sync(Base.metadata.drop_all)
        print("🗑️  Dropped existing tables")
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Created all tables")
    
    await engine.dispose()


async def setup_database():
    """Main function to setup the database."""
    print("🚀 Starting database setup for max_system...")
    print(f"📍 Database URL: {settings.DATABASE_URL}")
    
    try:
        # Create tables
        await create_tables()
        
        # Seed with initial data
        await seed_database()
        
        print("\n🎉 Database setup completed successfully!")
        print("\n🌐 You can now start the application:")
        print("   poetry run uvicorn app.main:app --reload")
        print("\n📚 Access the API documentation:")
        print("   http://localhost:8000/docs")
        
    except Exception as e:
        print(f"❌ Error setting up database: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(setup_database())