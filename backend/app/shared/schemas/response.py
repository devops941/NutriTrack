from typing import Any, Optional, Dict, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

T = TypeVar("T")

class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: str = "Operation completed successfully"
    meta: Dict[str, Any] = Field(default_factory=lambda: {
        "requestId": f"req_{uuid.uuid4().hex[:12]}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

ApiResponse = StandardResponse
