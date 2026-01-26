from beanie import init_beanie, Document, UnionDoc
from fastapi import FastAPI, APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.middleware.cors import CORSMiddleware

from app import MONGO_DSN, ENVIRONMENT, projectConfig
from app.routers import system, user, ai, bot_mail

if ENVIRONMENT == "prod":
    app = FastAPI(
        title=projectConfig.__projname__,
        version=projectConfig.__version__,
        description=projectConfig.__description__,
        docs_url=None
    )

else:
    app = FastAPI(
        title=projectConfig.__projname__,
        version=projectConfig.__version__,
        description=projectConfig.__description__
    )
    
api_router = APIRouter(prefix="/api")

api_router.include_router(system.router)
api_router.include_router(user.router)
api_router.include_router(ai.router)
api_router.include_router(bot_mail.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event('startup')
async def startup_event():
    import asyncio
    max_retries = 10
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            client = AsyncIOMotorClient(
                MONGO_DSN,
                serverSelectionTimeoutMS=5000
            )
            # Проверяем подключение
            await client.admin.command('ping')
            
            await init_beanie(
                database=client.get_default_database(),
                document_models=Document.__subclasses__() + UnionDoc.__subclasses__()
            )
            print(f"✅ Successfully connected to MongoDB on attempt {attempt + 1}")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️ MongoDB connection attempt {attempt + 1} failed: {e}. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
            else:
                print(f"❌ Failed to connect to MongoDB after {max_retries} attempts: {e}")
                raise