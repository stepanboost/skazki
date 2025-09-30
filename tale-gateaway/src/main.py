from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from src.database.database import setup_database
from src.routers.authorization.session_router import router as session_router
from src.routers.authorization.admin_router import router as admin_auth_router
from src.routers.audio_router import router as audio_router
from src.routers.fairy_tales_router import router as fairy_tales_router
from src.security import SessionMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    await setup_database()
    print("База данных инициализирована")
    yield
    from src.redis.client import redis_client
    await redis_client.close()
    print("Приложение остановлено")

security_scheme = HTTPBearer()

app = FastAPI(
    title="Tale API",
    description="API для платформы аудиокниг со сказками",
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True
    }
)

app.openapi_schema = None  # Сброс кэша для пересоздания схемы

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    from fastapi.openapi.utils import get_openapi
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Введите JWT токен сессии"
        }
    }
    
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            if path not in ["/health", "/docs", "/openapi.json"]:
                openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:8080", 
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://frontend:80",
        "http://frontend:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware)

app.include_router(session_router)
app.include_router(admin_auth_router)
app.include_router(audio_router)
app.include_router(fairy_tales_router)

@app.get("/")
async def root():
    return {"message": "Добро пожаловать в Skazki API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API работает корректно"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
