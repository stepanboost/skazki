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
    

    async def close(self):
        """Закрывает соединение с Redis"""
        await self.redis_client.close()

# Глобальный экземпляр Redis клиента
redis_client = RedisClient()
