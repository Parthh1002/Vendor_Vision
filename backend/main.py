import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from utils.seed import seed_database
from api import auth, vendors, rfqs, quotes, purchase_orders, invoices, analytics, copilot

# Configure standard python logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vendorvision")

app = FastAPI(
    title="VendorVision ERP - Backend API",
    description="Enterprise Procurement Management Platform API",
    version="2.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(rfqs.router)
app.include_router(quotes.router)
app.include_router(purchase_orders.router)
app.include_router(invoices.router)
app.include_router(analytics.router)
app.include_router(copilot.router)

@app.on_event("startup")
def startup_event():
    logger.info("Starting up VendorVision ERP backend...")
    try:
        # Auto-create tables and seed database
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Checking and seeding database...")
        seed_database()
        logger.info("Startup sequence completed successfully.")
    except Exception as e:
        logger.error(f"Error during startup sequence: {e}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "VendorVision ERP API Gateway",
        "version": "2.0.0",
        "docs": "/docs"
    }
