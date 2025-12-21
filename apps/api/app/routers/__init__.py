# apps/api/app/routers/__init__.py
# 단순화: 6개 라우터만 사용

from .health import router as health
from .auth import router as auth
from .items import router as items
from .claims import router as claims
from .search import router as search
from .me import router as me
