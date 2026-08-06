from fastapi import APIRouter

from api.v1 import assets, auth, jobs, public_gallery, public_tools, storage, tools

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth.router)
api_v1_router.include_router(jobs.router)
api_v1_router.include_router(storage.router)
api_v1_router.include_router(assets.router)
api_v1_router.include_router(tools.router)
api_v1_router.include_router(public_tools.router)
api_v1_router.include_router(public_gallery.router)
