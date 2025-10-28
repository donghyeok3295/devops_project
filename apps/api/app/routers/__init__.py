# apps/api/app/routers/__init__.py

from .health import router as health
from .auth import router as auth
from .items import router as items
from .claims import router as claims
from .search import router as search
from .stats import router as stats
from .activities import router as activities
from .me import router as me
