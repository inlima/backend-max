"""
Background task management for the WhatsApp bot.
"""

import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager

from app.core.database import get_db_session
from app.services.timeout_service import TimeoutService, get_timeout_service
from app.services.state_manager import StateManager
from app.services.message_builder import get_message_builder
from app.services.whatsapp_client import get_whatsapp_client
from app.services.security_service import SecurityService

logger = logging.getLogger(__name__)


class BackgroundTaskManager:
    """Manages background tasks for the application."""
    
    def __init__(self):
        self.timeout_service: Optional[TimeoutService] = None
        self.security_service: Optional[SecurityService] = None
        self.tasks = []
        self.is_running = False
    
    async def start_all_tasks(self):
        """Start all background tasks."""
        if self.is_running:
            logger.warning("Background tasks are already running")
            return
        
        try:
            # Initialize timeout service with database session
            async with get_db_session() as db_session:
                state_manager = StateManager(db_session)
                message_builder = get_message_builder()
                whatsapp_client = get_whatsapp_client()
                
                self.timeout_service = TimeoutService(
                    state_manager=state_manager,
                    message_builder=message_builder,
                    whatsapp_client=whatsapp_client
                )
            
            # Start timeout monitoring
            await self.timeout_service.start_monitoring(check_interval_minutes=5)
            
            # Initialize security service for data retention
            async with get_db_session() as db_session:
                self.security_service = SecurityService(db_session)
            
            # Start data retention cleanup task
            self.tasks.append(asyncio.create_task(self._data_retention_cleanup_task()))
            
            self.is_running = True
            logger.info("All background tasks started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start background tasks: {str(e)}")
            await self.stop_all_tasks()
            raise
    
    async def stop_all_tasks(self):
        """Stop all background tasks."""
        if not self.is_running:
            return
        
        try:
            # Stop timeout monitoring
            if self.timeout_service:
                await self.timeout_service.stop_monitoring()
            
            # Cancel other tasks
            for task in self.tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            self.tasks.clear()
            self.is_running = False
            logger.info("All background tasks stopped")
            
        except Exception as e:
            logger.error(f"Error stopping background tasks: {str(e)}")
    
    async def get_task_status(self) -> dict:
        """Get status of all background tasks."""
        status = {
            "is_running": self.is_running,
            "timeout_monitoring": False,
            "timeout_stats": {}
        }
        
        if self.timeout_service:
            status["timeout_monitoring"] = self.timeout_service._is_monitoring
            status["timeout_stats"] = self.timeout_service.get_timeout_stats()
        
        return status
    
    async def restart_timeout_monitoring(self):
        """Restart timeout monitoring service."""
        if self.timeout_service:
            await self.timeout_service.stop_monitoring()
            await self.timeout_service.start_monitoring(check_interval_minutes=5)
            logger.info("Timeout monitoring restarted")
    
    async def _data_retention_cleanup_task(self):
        """Background task for LGPD data retention cleanup."""
        while self.is_running:
            try:
                async with get_db_session() as db_session:
                    security_service = SecurityService(db_session)
                    
                    # Run data retention cleanup
                    cleanup_results = await security_service.run_data_retention_cleanup()
                    
                    if cleanup_results["deleted_sessions"] > 0 or cleanup_results["anonymized_sessions"] > 0:
                        logger.info(
                            f"Data retention cleanup completed: "
                            f"deleted {cleanup_results['deleted_sessions']} sessions, "
                            f"anonymized {cleanup_results['anonymized_sessions']} sessions"
                        )
                
            except Exception as e:
                logger.error(f"Error in data retention cleanup: {str(e)}")
            
            # Run daily at 2 AM (sleep for 24 hours)
            await asyncio.sleep(86400)


# Global background task manager
_task_manager = None


def get_task_manager() -> BackgroundTaskManager:
    """Get global background task manager instance."""
    global _task_manager
    if _task_manager is None:
        _task_manager = BackgroundTaskManager()
    return _task_manager


@asynccontextmanager
async def lifespan_manager():
    """Context manager for application lifespan with background tasks."""
    task_manager = get_task_manager()
    
    try:
        # Start background tasks
        await task_manager.start_all_tasks()
        yield task_manager
    
    finally:
        # Stop background tasks
        await task_manager.stop_all_tasks()


# Convenience functions for FastAPI integration
async def startup_background_tasks():
    """Startup function for FastAPI."""
    task_manager = get_task_manager()
    await task_manager.start_all_tasks()


async def shutdown_background_tasks():
    """Shutdown function for FastAPI."""
    task_manager = get_task_manager()
    await task_manager.stop_all_tasks()