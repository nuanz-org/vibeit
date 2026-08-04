from fastapi import APIRouter

from api.v1 import auth, jobs

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth.router)
api_v1_router.include_router(jobs.router)
