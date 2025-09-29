from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.utils.session_auth import verify_session_token
from src.utils.admin_auth import verify_admin_token
import logging

logger = logging.getLogger(__name__)

class SessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            # Пропускаем OPTIONS запросы (CORS preflight) - они должны обрабатываться CORS middleware
            if request.method == "OPTIONS":
                response = await call_next(request)
                return response
            
            # Публичные эндпоинты, которые не требуют сессии
            public_paths = ["/", "/health", "/docs", "/openapi.json", "/session/create"]
            
            # Админские эндпоинты (требуют админский токен)
            admin_paths = ["/admin/", "/files/upload", "/files/replace-", "/files/delete", "/files/audio/", "/files/cover/", "/fairy-tales/admin"]
            
            # Админские CRUD эндпоинты для сказок (POST, PUT, DELETE)
            admin_crud_paths = ["/fairy-tales/"]
            
            # Публичные админские эндпоинты
            public_admin_paths = ["/admin/login", "/admin/refresh"]
            
            # Публичные файловые эндпоинты (для получения presigned URL)
            public_file_paths = ["/files/download"]
            
            # Файловые эндпоинты (требуют админский токен, но пропускаем OPTIONS)
            file_paths = ["/files/upload", "/files/replace-", "/files/delete", "/files/audio/", "/files/cover/"]
            
            # Проверяем, является ли это публичным эндпоинтом
            is_public = (
                request.url.path in public_paths or 
                request.url.path in public_admin_paths or
                any(request.url.path.startswith(path) for path in public_file_paths)
            )
            
            # Проверяем, является ли это файловым эндпоинтом
            is_file_endpoint = any(request.url.path.startswith(path) for path in file_paths)
            
            if is_public:
                response = await call_next(request)
                return response
            
            # Для файловых эндпоинтов пропускаем OPTIONS запросы
            if is_file_endpoint and request.method == "OPTIONS":
                response = await call_next(request)
                return response
            
            # Проверяем, является ли это админским эндпоинтом
            is_admin_endpoint = any(request.url.path.startswith(path) for path in admin_paths)
            
            # Проверяем, является ли это админским CRUD эндпоинтом (POST, PUT, DELETE)
            is_admin_crud_endpoint = (
                any(request.url.path.startswith(path) for path in admin_crud_paths) and
                request.method in ["POST", "PUT", "DELETE"]
            )
            
            # Для админских эндпоинтов требуем админский токен
            if is_admin_endpoint or is_admin_crud_endpoint:
                auth_header = request.headers.get("Authorization")
                if not auth_header or not auth_header.startswith("Bearer "):
                    response = JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Access denied. Admin token required."}
                    )
                    # Добавляем CORS заголовки
                    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response.headers["Access-Control-Allow-Credentials"] = "true"
                    return response
                
                token = auth_header.split(" ")[1]
                payload = await verify_admin_token(token)
                if not payload:
                    response = JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Access denied. Invalid admin token."}
                    )
                    # Добавляем CORS заголовки
                    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response.headers["Access-Control-Allow-Credentials"] = "true"
                    return response
                
                request.state.admin_id = payload.get("sub")
                response = await call_next(request)
                return response
            
            # Для всех остальных эндпоинтов требуем сессионный токен
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                response = JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Access denied. Authentication required."}
                )
                # Добавляем CORS заголовки
                response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                response.headers["Access-Control-Allow-Credentials"] = "true"
                return response
            
            token = auth_header.split(" ")[1]
            session_id = verify_session_token(token)
            if not session_id:
                response = JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Access denied. Invalid session token."}
                )
                # Добавляем CORS заголовки
                response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                response.headers["Access-Control-Allow-Credentials"] = "true"
                return response
            
            request.state.session_id = session_id
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
            # Добавляем CORS заголовки
            response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
        except Exception as e:
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": f"Внутренняя ошибка сервера: {str(e)}"}
            )
            # Добавляем CORS заголовки
            response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response.headers["Access-Control-Allow-Credentials"] = "true"
            return response