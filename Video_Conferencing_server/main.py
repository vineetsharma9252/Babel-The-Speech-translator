import asyncio
import logging
import sys
import os
from aiohttp import web
from server import VoiceTranslationServer
from config import Config

# Setup logging with proper encoding for Windows
def setup_logging():
    # Remove all existing handlers
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
    
    # Create a handler that supports UTF-8 encoding
    handler = logging.StreamHandler(sys.stdout)
    
    # Force UTF-8 encoding on Windows
    if sys.platform == "win32":
        try:
            # Try to set stdout encoding to UTF-8
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        except:
            pass
    
    # Create formatter without emojis for Windows compatibility
    if sys.platform == "win32":
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    handler.setFormatter(formatter)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler]
    )

setup_logging()
logger = logging.getLogger(__name__)

class Application:
    def __init__(self):
        self.server = None
        self.runner = None
        self.site = None
        self.shutdown_event = asyncio.Event()
        
    async def startup(self):
        """Initialize and start the server"""
        logger.info("Starting Voice Translation Server...")
        
        try:
            # Create server instance
            self.server = VoiceTranslationServer()
            
            # Initialize server components
            await self.server.initialize()
            
            # Create web application
            app = self.server.create_app()
            
            # Start HTTP server
            self.runner = web.AppRunner(app)
            await self.runner.setup()
            
            self.site = web.TCPSite(
                self.runner, 
                Config.HOST, 
                Config.PORT
            )
            await self.site.start()
            
            logger.info(f"Server running on http://{Config.HOST}:{Config.PORT}")
            logger.info(f"WebSocket endpoint: ws://{Config.HOST}:{Config.PORT}/ws")
            logger.info(f"Environment: {Config.ENVIRONMENT}")
            logger.info("Press Ctrl+C to stop the server")
            
        except Exception as e:
            logger.error(f"Failed to start server: {e}")
            raise
    
    async def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down server...")
        
        if self.server:
            await self.server.cleanup()
        
        if self.site:
            await self.site.stop()
        
        if self.runner:
            await self.runner.cleanup()
        
        logger.info("Server shutdown complete")
        self.shutdown_event.set()

async def main():
    """Main entry point"""
    app = Application()
    
    try:
        await app.startup()
        logger.info("Server is running. Press Ctrl+C to stop.")
        await app.shutdown_event.wait()
        
    except KeyboardInterrupt:
        logger.info("Received Ctrl+C, shutting down...")
        await app.shutdown()
    except Exception as e:
        logger.error(f"Server error: {e}")
        await app.shutdown()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user")
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)