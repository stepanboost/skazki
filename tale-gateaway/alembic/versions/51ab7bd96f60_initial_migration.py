"""Initial migration

Revision ID: 51ab7bd96f60
Revises: 
Create Date: 2025-09-29 10:01:34.127601

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51ab7bd96f60'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Создание таблицы admins
    op.create_table('admins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admins_id'), 'admins', ['id'], unique=False)
    op.create_index(op.f('ix_admins_username'), 'admins', ['username'], unique=True)
    
    # Создание таблицы anonymous_sessions
    op.create_table('anonymous_sessions',
        sa.Column('session_id', sa.String(length=255), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('session_id')
    )
    op.create_index(op.f('ix_anonymous_sessions_session_id'), 'anonymous_sessions', ['session_id'], unique=False)
    
    # Создание таблицы fairy_tales
    op.create_table('fairy_tales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('author_name', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('audio_external_name', sa.String(length=500), nullable=True),
        sa.Column('cover_external_name', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'PUBLISHED', name='fairytalestatus'), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['admins.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fairy_tales_id'), 'fairy_tales', ['id'], unique=False)
    op.create_index(op.f('ix_fairy_tales_external_id'), 'fairy_tales', ['external_id'], unique=True)
    op.create_index(op.f('ix_fairy_tales_title'), 'fairy_tales', ['title'], unique=False)
    
    # Создание таблицы audio_files
    op.create_table('audio_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('fairy_tale_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['fairy_tale_id'], ['fairy_tales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audio_files_id'), 'audio_files', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Удаление таблиц в обратном порядке
    op.drop_index(op.f('ix_audio_files_id'), table_name='audio_files')
    op.drop_table('audio_files')
    
    op.drop_index(op.f('ix_fairy_tales_title'), table_name='fairy_tales')
    op.drop_index(op.f('ix_fairy_tales_external_id'), table_name='fairy_tales')
    op.drop_index(op.f('ix_fairy_tales_id'), table_name='fairy_tales')
    op.drop_table('fairy_tales')
    
    op.drop_index(op.f('ix_anonymous_sessions_session_id'), table_name='anonymous_sessions')
    op.drop_table('anonymous_sessions')
    
    op.drop_index(op.f('ix_admins_username'), table_name='admins')
    op.drop_index(op.f('ix_admins_id'), table_name='admins')
    op.drop_table('admins')
    
    # Удаление enum типа
    op.execute('DROP TYPE IF EXISTS fairytalestatus')
