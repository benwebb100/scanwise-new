from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv
import os
import time
from datetime import datetime
from utils.logging_config import setup_logging

# Import routers
from api.routes import router
from api.admin_routes import admin_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('scanwise.log')
    ]
)

logger = logging.getLogger(__name__)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 50)
    logger.info("Starting SCANWISE AI Backend...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Supabase URL: {os.getenv('SUPABASE_URL', 'Not configured')}")
    logger.info(f"Docs available at: http://localhost:8000/docs")
    logger.info("All services initialized")
    logger.info("=" * 50)
    
    yield
    
    # Shutdown
    logger.info("Shutting down SCANWISE AI Backend...")
    logger.info("Cleanup completed")

# Create FastAPI app
app = FastAPI(
    title="SCANWISE AI Backend",
    description="Professional dental AI analysis backend using Roboflow and OpenAI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan  # Using lifespan instead of on_event
)

# At the start of your app
setup_logging()

# Configure CORS
origins = [
    "http://localhost:5173",  # Local development
    "http://localhost:3000",  # Alternative local port
    "https://frontend-scanwise.onrender.com",  # Your frontend domain
    "https://scanwise-new-1.onrender.com",  # Your new frontend domain
    "https://scan-wise.com",  # Your custom domain
    "https://www.scan-wise.com"  # Your custom domain with www
]

# Add any additional origins from environment variable
env_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
if env_origins and env_origins[0]:  # Only add if not empty
    origins.extend(env_origins)

logger.info(f"CORS origins configured: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f" {request.method} {request.url.path}")
    
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        response = JSONResponse(content={}, status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(
        f" {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    # Add custom headers
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-API-Version"] = "1.0.0"
    
    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if os.getenv("ENVIRONMENT") == "development" else "An error occurred",
            "timestamp": datetime.now().isoformat(),
            "path": request.url.path
        }
    )

# Include routers
app.include_router(router, prefix="/api/v1", tags=["X-Ray Analysis"])
app.include_router(admin_router, prefix="/api/v1", tags=["Admin"])

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to SCANWISE AI Backend",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        },
        "endpoints": {
            "health": "/api/v1/health",
            "health_detailed": "/api/v1/health/detailed",
            "analyze": "/api/v1/analyze-xray"
        },
        "features": [
            "Dental X-ray analysis with Roboflow",
            "AI-powered treatment recommendations with GPT-4",
            "Secure storage with Supabase",
            "JWT-based authentication"
        ]
    }

# API info endpoint
@app.get("/api/info", tags=["Info"])
async def api_info():
    return {
        "api_name": "SCANWISE AI",
        "api_version": "1.0.0",
        "description": "Dental AI analysis system for panoramic X-rays",
        "capabilities": {
            "detection": ["Caries", "Root Pieces", "Fillings", "Crowns", "Implants"],
            "analysis": "GPT-4 powered treatment staging and recommendations",
            "storage": "Secure cloud storage for X-rays and annotated images",
            "reporting": "Structured JSON reports for frontend rendering"
        },
        "technical_stack": {
            "framework": "FastAPI",
            "database": "Supabase (PostgreSQL)",
            "storage": "Supabase Storage",
            "ai_vision": "Roboflow",
            "ai_language": "OpenAI GPT-4",
            "authentication": "Supabase Auth (JWT)"
        },
        "rate_limits": {
            "requests_per_minute": 60,
            "max_file_size": "10MB",
            "supported_formats": ["jpg", "jpeg", "png"]
        }
    }

# 404 handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Endpoint not found",
            "path": request.url.path,
            "available_endpoints": {
                "root": "/",
                "api_info": "/api/info",
                "health": "/api/v1/health",
                "analyze": "/api/v1/analyze-xray"
            }
        }
    )

# Main entry point
if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    # Configure uvicorn
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
        access_log=True,
        use_colors=True
    )