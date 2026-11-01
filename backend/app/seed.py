"""Lokal ishlab chiqish uchun: python -m app.seed boshlangich_malumot.json [replace|append]"""
import json
import sys

from .db import Base, SessionLocal, engine
from .routers.meta import restore

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "boshlangich_malumot.json"
    mode = sys.argv[2] if len(sys.argv) > 2 else "replace"
    Base.metadata.create_all(engine)
    with open(path, encoding="utf-8") as fh:
        payload = json.load(fh)
    with SessionLocal() as db:
        print(restore(payload, mode, db))
