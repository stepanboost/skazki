from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import select
from typing import AsyncGenerator, Annotated
from fastapi import Depends
from src.config import settings

engine = create_async_engine(settings.database_url)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Создание админа по умолчанию (после создания таблиц)
    try:
        await create_default_admin()
    except Exception as e:
        print(f"Ошибка при создании админа: {e}")
        # Не прерываем запуск приложения, если админ уже существует

async def create_default_admin():
    """Создание админа по умолчанию из настроек"""
    from src.database.models import Admin
    from src.utils.admin_auth import get_password_hash
    
    async with AsyncSessionLocal() as db:
        # Проверяем, есть ли уже админ
        result = await db.execute(select(Admin).filter(Admin.username == settings.admin_username))
        existing_admin = result.scalar_one_or_none()
        
        if not existing_admin:
            # Создаем админа
            admin = Admin(
                username=settings.admin_username,
                hashed_password=get_password_hash(settings.admin_password)
            )
            
            db.add(admin)
            await db.commit()
            print(f"Админ создан: username={settings.admin_username}")
        else:
            print(f"Админ {settings.admin_username} уже существует")

SessionDep = Annotated[AsyncSession, Depends(get_db)]