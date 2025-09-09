"""
Logging configuration for clean WhatsApp bot logs
"""

import logging
import sys

def setup_logging():
    """Configure logging to show only relevant messages."""
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    
    # Silence uvicorn access logs
    logging.getLogger("uvicorn.access").setLevel(logging.ERROR)
    logging.getLogger("uvicorn").setLevel(logging.ERROR)
    
    # Silence other noisy loggers
    logging.getLogger("httpx").setLevel(logging.ERROR)
    logging.getLogger("httpcore").setLevel(logging.ERROR)
    
    # Keep our app logs at INFO level
    logging.getLogger("app").setLevel(logging.INFO)
    
    return logging.getLogger("app.webhooks")