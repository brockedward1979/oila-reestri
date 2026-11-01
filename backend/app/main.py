from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import select, text

from . import models
from .auth import check_credentials, make_token
from .config import CORS_ORIGINS
from .db import Base, SessionLocal, engine
from .routers import families, meta
from .schemas import LoginIn

@asynccontextmanager
async def lifespan(_: FastAPI):
    startup()
    yield


def startup() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalars(select(models.ExportPreset)).first():
            p = meta.DEFAULT_PRESET
            db.add(models.ExportPreset(name=p["name"], mode=p["mode"], title_case=True, cols=p["cols"]))
            db.commit()


app = FastAPI(title="Oila reestri API", version="1.0", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health():
    """Render tekshiruvi uchun. Bazaga murojaat qilmaydi, Neon bekorga uyg'onmasin."""
    return {"ok": True}


@app.get("/api/health/db")
def health_db():
    with SessionLocal() as db:
        db.execute(text("select 1"))
    return {"ok": True, "db": engine.dialect.name}


@app.post("/api/auth/login")
def login(data: LoginIn):
    if not check_credentials(data.username.strip(), data.password):
        raise HTTPException(401, "Login yoki parol noto‘g‘ri")
    return {"token": make_token(data.username.strip()), "username": data.username.strip()}


app.include_router(families.router)
app.include_router(meta.router)
