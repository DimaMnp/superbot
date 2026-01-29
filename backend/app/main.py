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
from fastapi import Request
import time


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.0.119:3000",
#        "http://5.35.12.207:3000",
        "http://frontend:3000",
	"https://dimamnp.ru",
	"https://www.dimamnp.ru"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event('startup')
async def startup_event():
    client = AsyncIOMotorClient(MONGO_DSN)
    database = client["newbotbase"]

    await init_beanie(
       database=database,
       document_models=Document.__subclasses__() + UnionDoc.__subclasses__()
    )
