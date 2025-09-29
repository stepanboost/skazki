import redis.asyncio as redis
import json
from typing import Optional, Dict, Any
from src.config import settings

class RedisClient:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password if settings.redis_password else None,
            decode_responses=True
        )
    
    async def is_token_blocked(self, token: str) -> bool:
        """Проверяет, заблокирован ли токен"""
        try:
            result = await self.redis_client.get(f"blocked_token:{token}")
            return result is not None
        except Exception as e:
            print(f"Redis error checking blocked token: {e}")
            return False
    
    async def block_token(self, token: str, ttl: int = 3600) -> bool:
        """Блокирует токен на указанное время (по умолчанию 1 час)"""
        try:
            await self.redis_client.setex(f"blocked_token:{token}", ttl, "blocked")
            return True
        except Exception as e:
            print(f"Redis error blocking token: {e}")
            return False
    
    async def unblock_token(self, token: str) -> bool:
        """Разблокирует токен"""
        try:
            await self.redis_client.delete(f"blocked_token:{token}")
            return True
        except Exception as e:
            print(f"Redis error unblocking token: {e}")
            return False
    
    async def set_session_data(self, session_id: str, data: Dict[str, Any], ttl: int = 3600) -> bool:
        """Сохраняет данные сессии"""
        try:
            await self.redis_client.setex(f"session:{session_id}", ttl, json.dumps(data))
            return True
        except Exception as e:
            print(f"Redis error setting session data: {e}")
            return False
    
    async def get_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Получает данные сессии"""
        try:
            data = await self.redis_client.get(f"session:{session_id}")
            return json.loads(data) if data else None
        except Exception as e:
            print(f"Redis error getting session data: {e}")
            return None
    
    async def delete_session_data(self, session_id: str) -> bool:
        """Удаляет данные сессии"""
        try:
            await self.redis_client.delete(f"session:{session_id}")
            return True
        except Exception as e:
            print(f"Redis error deleting session data: {e}")
            return False

    async def close(self):
        """Закрывает соединение с Redis"""
        await self.redis_client.close()

# Глобальный экземпляр Redis клиента
redis_client = RedisClient()
