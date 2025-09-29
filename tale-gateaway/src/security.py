from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.utils.session_auth import verify_session_token
from src.utils.admin_auth import verify_admin_token
import logging
from typing import Set

logger = logging.getLogger(__name__)

class RouteConfig:
    """Конфигурация маршрутов для middleware"""
    
    # Публичные маршруты (не требуют аутентификации)
    PUBLIC_ROUTES: Set[str] = {
        "/", "/health", "/docs", "/openapi.json", "/session/create"
    }
    
    # Публичные админские маршруты (только для входа/обновления токенов)
    PUBLIC_ADMIN_ROUTES: Set[str] = {
        "/admin/login", "/admin/refresh"
    }
    
    # Публичные файловые маршруты (скачивание файлов)
    PUBLIC_FILE_ROUTES: Set[str] = {
        "/files/download"
    }
    
    # Админские маршруты (требуют админский токен)
    ADMIN_ROUTES: Set[str] = {
        "/admin/", "/files/upload", "/files/replace-", "/files/delete", 
        "/files/audio/", "/files/cover/", "/fairy-tales/admin"
    }
    
    # Админские CRUD операции (POST, PUT, DELETE на сказках)
    ADMIN_CRUD_ROUTES: Set[str] = {
        "/fairy-tales/"
    }
    
    # Методы, которые требуют админских прав для CRUD
    ADMIN_CRUD_METHODS: Set[str] = {"POST", "PUT", "DELETE"}

class SessionMiddleware(BaseHTTPMiddleware):
    """Middleware для обработки аутентификации и авторизации"""
    
    def __init__(self, app):
        super().__init__(app)
        self.route_config = RouteConfig()
    
    def _is_public_route(self, path: str) -> bool:
        """Проверяет, является ли маршрут публичным"""
        return (
            path in self.route_config.PUBLIC_ROUTES or
            path in self.route_config.PUBLIC_ADMIN_ROUTES or
            any(path.startswith(route) for route in self.route_config.PUBLIC_FILE_ROUTES)
        )
    
    def _is_admin_route(self, path: str, method: str) -> bool:
        """Проверяет, требует ли маршрут админских прав"""
        # Прямые админские маршруты
        if any(path.startswith(route) for route in self.route_config.ADMIN_ROUTES):
            return True
        
        # CRUD операции на сказках
        if (any(path.startswith(route) for route in self.route_config.ADMIN_CRUD_ROUTES) and
            method in self.route_config.ADMIN_CRUD_METHODS):
            return True
        
        return False
    
    def _add_cors_headers(self, response: JSONResponse, request: Request) -> JSONResponse:
        """Добавляет CORS заголовки к ответу"""
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    def _create_error_response(self, status_code: int, detail: str, request: Request) -> JSONResponse:
        """Создает стандартизированный ответ об ошибке"""
        response = JSONResponse(
            status_code=status_code,
            content={"detail": detail}
        )
        return self._add_cors_headers(response, request)
    
    async def _handle_admin_auth(self, request: Request) -> tuple[bool, str]:
        """Обрабатывает аутентификацию администратора"""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return False, "Access denied. Admin token required."
        
        token = auth_header.split(" ")[1]
        payload = await verify_admin_token(token)
        if not payload:
            return False, "Access denied. Invalid admin token."
        
        request.state.admin_id = payload.get("sub")
        return True, ""
    
    async def _handle_session_auth(self, request: Request) -> tuple[bool, str]:
        """Обрабатывает аутентификацию сессии"""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return False, "Access denied. Authentication required."
        
        token = auth_header.split(" ")[1]
        session_id = verify_session_token(token)
        if not session_id:
            return False, "Access denied. Invalid session token."
        
        request.state.session_id = session_id
        return True, ""
    
    async def dispatch(self, request: Request, call_next):
        """Основной метод обработки запросов"""
        try:
            # OPTIONS запросы всегда проходят
            if request.method == "OPTIONS":
                response = await call_next(request)
                return response
            
            path = request.url.path
            method = request.method
            
            # Публичные маршруты проходят без аутентификации
            if self._is_public_route(path):
                response = await call_next(request)
                return response
            
            # Проверяем, требует ли маршрут админских прав
            if self._is_admin_route(path, method):
                success, error_msg = await self._handle_admin_auth(request)
                if not success:
                    return self._create_error_response(status.HTTP_401_UNAUTHORIZED, error_msg, request)
            else:
                # Обычная аутентификация сессии
                success, error_msg = await self._handle_session_auth(request)
                if not success:
                    return self._create_error_response(status.HTTP_401_UNAUTHORIZED, error_msg, request)
            
            # Выполняем запрос
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            return self._create_error_response(e.status_code, e.detail, request)
        except Exception as e:
            logger.error(f"Unexpected error in middleware: {e}")
            return self._create_error_response(
                status.HTTP_500_INTERNAL_SERVER_ERROR, 
                f"Внутренняя ошибка сервера: {str(e)}", 
                request
            )