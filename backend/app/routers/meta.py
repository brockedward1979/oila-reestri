from datetime import date
from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..auth import current_user
from ..db import get_db
from ..schemas import CustomFieldIn, CustomFieldOut, FamilyCreate, PresetIn, PresetOut
from ..serialize import apply_family, apply_member, family_out

router = APIRouter(prefix="/api", tags=["sozlamalar"], dependencies=[Depends(current_user)])

DEFAULT_SETTINGS = {"stdMahalla": "ЖАЛОИЛ МФЙ", "stdSheet": "Лист1", "defaultMahalla": "Jaloil MFY"}
DEFAULT_PRESET = {"name": "Oila boshliqlari ro‘yxati", "mode": "oila", "titleCase": True,
                  "cols": ["no", "mahalla", "boshliq", "boshliqJsh", "telefon", "toifa", "azoSoni", "u18Soni"]}


def preset_out(p: models.ExportPreset) -> dict:
    return {"id": p.id, "name": p.name, "mode": p.mode, "titleCase": p.title_case, "cols": p.cols or []}


def cf_out(c: models.CustomField) -> dict:
    return {"id": c.id, "label": c.label, "scope": c.scope, "type": c.type, "options": c.options or []}


def get_settings(db: Session) -> dict:
    s = db.get(models.Setting, "app")
    return {**DEFAULT_SETTINGS, **(s.value if s else {})}


# ── Qo'shimcha ustunlar ──
@router.get("/custom-fields", response_model=list[CustomFieldOut])
def list_cf(db: Session = Depends(get_db)):
    return [cf_out(c) for c in db.scalars(select(models.CustomField).order_by(models.CustomField.id))]


@router.post("/custom-fields", response_model=CustomFieldOut, status_code=201)
def create_cf(data: CustomFieldIn, db: Session = Depends(get_db)):
    c = models.CustomField(label=data.label.strip(), scope=data.scope, type=data.type,
                           options=[o.strip() for o in data.options if o.strip()])
    db.add(c)
    db.commit()
    return cf_out(c)


@router.delete("/custom-fields/{cid}", status_code=204)
def delete_cf(cid: int, db: Session = Depends(get_db)):
    c = db.get(models.CustomField, cid)
    if not c:
        raise HTTPException(404, "Ustun topilmadi")
    db.delete(c)
    db.commit()


# ── Eksport shablonlari ──
@router.get("/presets", response_model=list[PresetOut])
def list_presets(db: Session = Depends(get_db)):
    return [preset_out(p) for p in db.scalars(select(models.ExportPreset).order_by(models.ExportPreset.id))]


@router.post("/presets", response_model=PresetOut, status_code=201)
def create_preset(data: PresetIn, db: Session = Depends(get_db)):
    p = models.ExportPreset(name=data.name, mode=data.mode, title_case=data.titleCase, cols=data.cols)
    db.add(p)
    db.commit()
    return preset_out(p)


@router.put("/presets/{pid}", response_model=PresetOut)
def update_preset(pid: int, data: PresetIn, db: Session = Depends(get_db)):
    p = db.get(models.ExportPreset, pid)
    if not p:
        raise HTTPException(404, "Shablon topilmadi")
    p.name, p.mode, p.title_case, p.cols = data.name, data.mode, data.titleCase, data.cols
    db.commit()
    return preset_out(p)


@router.delete("/presets/{pid}", status_code=204)
def delete_preset(pid: int, db: Session = Depends(get_db)):
    p = db.get(models.ExportPreset, pid)
    if p:
        db.delete(p)
        db.commit()


# ── Sozlamalar ──
@router.get("/settings")
def read_settings(db: Session = Depends(get_db)):
    return get_settings(db)


@router.put("/settings")
def write_settings(data: dict = Body(...), db: Session = Depends(get_db)):
    clean = {k: str(v)[:120] for k, v in data.items() if k in DEFAULT_SETTINGS}
    s = db.get(models.Setting, "app")
    if s:
        s.value = {**(s.value or {}), **clean}
    else:
        db.add(models.Setting(key="app", value=clean))
    db.commit()
    return get_settings(db)


# ── Zaxira nusxa ──
@router.get("/backup")
def backup(db: Session = Depends(get_db)):
    fams = db.scalars(select(models.Family).options(selectinload(models.Family.azolar)).order_by(models.Family.id)).all()
    return {
        "version": 2,
        "families": [family_out(f) for f in fams],
        "customFields": list_cf(db),
        "presets": list_presets(db),
        "settings": get_settings(db),
    }


def _derive(m: dict) -> dict:
    """JSHSHIR bo'lsa, bo'sh tug'ilgan sana va jinsni undan to'ldiradi."""
    j = str(m.get("jshshir") or "")
    if len(j) == 14 and j.isdigit():
        base = {"1": 1800, "2": 1800, "3": 1900, "4": 1900, "5": 2000, "6": 2000}.get(j[0])
        if base:
            try:
                d = date(base + int(j[5:7]), int(j[3:5]), int(j[1:3]))
                m.setdefault("tugilganSana", "")
                m["tugilganSana"] = m["tugilganSana"] or d.strftime("%d.%m.%Y")
                m["jinsi"] = m.get("jinsi") or ("Erkak" if int(j[0]) % 2 else "Ayol")
            except ValueError:
                pass
    return m


@router.post("/restore")
def restore(payload: dict = Body(...), mode: Literal["replace", "append"] = "replace", db: Session = Depends(get_db)):
    fams = payload.get("families")
    if not isinstance(fams, list):
        raise HTTPException(400, "Bu fayl reestr zaxirasi emas")

    if mode == "replace":
        db.execute(delete(models.Member))
        db.execute(delete(models.Family))
        db.execute(delete(models.CustomField))
        db.execute(delete(models.ExportPreset))
        db.flush()

    # Eski ustun id'larini yangilariga bog'laymiz (extra kalitlari va shablon ustunlari uchun)
    cf_map: dict[str, str] = {}
    for c in payload.get("customFields") or []:
        try:
            data = CustomFieldIn.model_validate(c)
        except ValidationError:
            continue
        row = models.CustomField(label=data.label, scope=data.scope, type=data.type, options=data.options)
        db.add(row)
        db.flush()
        cf_map[str(c.get("id"))] = str(row.id)

    remap = lambda extra: {cf_map.get(str(k), str(k)): v for k, v in (extra or {}).items()}
    errors, added = [], 0
    for i, f in enumerate(fams):
        try:
            data = FamilyCreate.model_validate({
                **f, "extra": remap(f.get("extra")),
                "azolar": [_derive({**m, "extra": remap(m.get("extra"))}) for m in f.get("azolar") or []],
            })
        except ValidationError as e:
            errors.append(f"{i + 1}-oila: {e.errors()[0].get('msg')}")
            continue
        row = models.Family()
        apply_family(row, data)
        for t, md in enumerate(data.azolar):
            m = models.Member(tartib=t)
            apply_member(m, md)
            row.azolar.append(m)
        db.add(row)
        added += 1

    for p in payload.get("presets") or []:
        try:
            data = PresetIn.model_validate(p)
        except ValidationError:
            continue
        cols = [("x." + cf_map.get(c[2:], c[2:])) if c.startswith("x.") else c for c in data.cols]
        db.add(models.ExportPreset(name=data.name, mode=data.mode, title_case=data.titleCase, cols=cols))

    if mode == "replace" and not payload.get("presets"):
        db.add(models.ExportPreset(name=DEFAULT_PRESET["name"], mode="oila", title_case=True, cols=DEFAULT_PRESET["cols"]))
    if isinstance(payload.get("settings"), dict):
        write_settings(payload["settings"], db)
    db.commit()
    return {"added": added, "errors": errors}
