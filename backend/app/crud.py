from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional


async def get_by_id(db: AsyncSession, model, entity_id: int):
    result = await db.execute(select(model).where(model.id == entity_id))
    return result.scalar_one_or_none()


async def get_by_field(db: AsyncSession, model, field: str, value):
    column = getattr(model, field)
    result = await db.execute(select(model).where(column == value))
    return result.scalar_one_or_none()


async def get_all(
    db: AsyncSession,
    model,
    filters: Optional[dict] = None,
    order_by: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
):
    query = select(model)
    if filters:
        for field, value in filters.items():
            if value is not None:
                column = getattr(model, field, None)
                if column is not None:
                    query = query.where(column == value)
    if order_by:
        column = getattr(model, order_by, None)
        if column is not None:
            query = query.order_by(column)
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


async def create(db: AsyncSession, model, **kwargs):
    instance = model(**kwargs)
    db.add(instance)
    await db.commit()
    await db.refresh(instance)
    return instance


async def update(db: AsyncSession, db_obj, **kwargs):
    for key, value in kwargs.items():
        setattr(db_obj, key, value)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def delete(db: AsyncSession, db_obj):
    await db.delete(db_obj)
    await db.commit()


async def count(db: AsyncSession, model, filters: Optional[dict] = None) -> int:
    query = select(func.count()).select_from(model)
    if filters:
        for field, value in filters.items():
            if value is not None:
                column = getattr(model, field, None)
                if column is not None:
                    query = query.where(column == value)
    result = await db.execute(query)
    return result.scalar()
