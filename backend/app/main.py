from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.settings import settings
from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.shared.schemas.response import StandardResponse
from app.modules.auth.router import router as auth_router
from app.modules.profiles.router import router as profiles_router
from app.modules.foods.router import router as foods_router
from app.modules.nutrition.router import router as nutrition_router
from app.modules.labels.router import router as labels_router
from app.modules.meals.router import router as meals_router
from app.modules.targets.router import router as targets_router
from app.modules.comparison.router import router as comparison_router
from app.modules.analytics.router import router as analytics_router
from app.modules.meal_plans.router import router as meal_plans_router
from app.modules.reports.router import router as reports_router
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nutritrack")

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

async def init_db_indexes():
    db = get_database()
    if db is not None:
        try:
            # Users indexes
            await db.users.create_index("email", unique=True)
            await db.users.create_index("status")
            await db.users.create_index("roles")

            # Profiles index
            await db.user_profiles.create_index("userId", unique=True)

            # Refresh tokens index
            await db.refresh_tokens.create_index("tokenHash", unique=True)
            await db.refresh_tokens.create_index("expiresAt", expireAfterSeconds=0)

            # Foods indexes
            await db.food_categories.create_index("slug", unique=True)
            await db.foods.create_index([("normalizedName", "text"), ("name", "text")])
            await db.foods.create_index("categoryId")
            await db.foods.create_index("verificationStatus")
            await db.foods.create_index("barcode")

            # OCR Labels indexes
            await db.food_labels.create_index("userId")
            await db.food_labels.create_index("status")
            await db.label_extractions.create_index("labelId")
            await db.audit_logs.create_index("labelId")

            # Meals indexes
            await db.meals.create_index([("userId", 1), ("dateStr", 1)])
            await db.meals.create_index([("userId", 1), ("consumedAt", 1)])
            await db.saved_meals.create_index([("userId", 1), ("name", 1)])

            # Targets & Comparison indexes
            await db.reference_sets.create_index("code", unique=True)
            await db.user_targets.create_index("userId", unique=True)
            await db.comparison_history.create_index([("userId", 1), ("comparedAt", -1)])

            # Meal Plans & Reports indexes
            await db.meal_plans.create_index([("userId", 1), ("date", 1)], unique=True)
            await db.reports.create_index([("userId", 1), ("generatedAt", -1)])

            logger.info("Database indexes initialized successfully.")
        except Exception as e:
            logger.warning(f"Index initialization notice: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await init_db_indexes()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="NutriTrack API",
    description="Smart Food Label Intelligence & Meal Nutrient Analysis API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount feature routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(profiles_router, prefix="/api/v1")
app.include_router(foods_router, prefix="/api/v1")
app.include_router(nutrition_router, prefix="/api/v1")
app.include_router(labels_router, prefix="/api/v1")
app.include_router(meals_router, prefix="/api/v1")
app.include_router(targets_router, prefix="/api/v1")
app.include_router(comparison_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(meal_plans_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")

@app.get("/api/v1/health", response_model=StandardResponse, tags=["Health"])
async def health_check():
    db = get_database()
    db_status = "connected" if db is not None else "disconnected"

    return StandardResponse(
        success=True,
        data={
            "status": "healthy",
            "environment": settings.APP_ENV,
            "version": "1.0.0",
            "database": db_status
        },
        message="NutriTrack API is operational"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
