"""
Операции с базой данных, сгруппированные по объектам.
"""

from .admin_operations import AdminOperations
from .session_operations import SessionOperations
from .fairy_tale_operations import FairyTaleOperations
from .audio_file_operations import AudioFileOperations

__all__ = [
    "AdminOperations",
    "SessionOperations", 
    "FairyTaleOperations",
    "AudioFileOperations"
]
