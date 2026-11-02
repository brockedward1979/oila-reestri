import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..auth import current_user
from ..db import get_db
from ..schemas import FamilyCreate, FamilyIn, FamilyOut, MemberIn, MemberOut
from ..serialize import apply_family, apply_member, family_out, member_out

router = APIRouter(prefix="/api", tags=["oilalar"], dependencies=[Depends(current_user)])


def _family(db: Session, fid: int) -> models.Family:
    f = db.get(models.Family, fid, options=[selectinload(models.Family.azolar)])
    if not f:
        raise HTTPException(404, "Oila topilmadi")
    return f


def _member(db: Session, mid: int) -> models.Member:
    m = db.get(models.Member, mid)
    if not m:
        raise HTTPException(404, "A’zo topilmadi")
    return m


def _unique_jsh(db: Session, jsh: str, exclude_id: int | None = None) -> None:
    if not jsh:
        return
    q = select(models.Member).where(models.Member.jshshir == jsh)
    if exclude_id:
        q = q.where(models.Member.id != exclude_id)
    other = db.scalars(q).first()
    if other:
        raise HTTPException(409, f"Bu JSHSHIR allaqachon {other.fio} uchun kiritilgan")


def etag_json(request: Request, payload) -> Response:
    """Ma'lumot o'zgarmagan bo'lsa 304 qaytaradi: brauzer keshdagisini ishlatadi, internet trafigi tejaladi."""
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str).encode()
    tag = '"' + hashlib.md5(body).hexdigest() + '"'
    headers = {"ETag": tag, "Cache-Control": "private, no-cache"}
    if request.headers.get("if-none-match") == tag:
        return Response(status_code=304, headers=headers)
    return Response(content=body, media_type="application/json", headers=headers)


@router.get("/bootstrap")
def bootstrap(request: Request, db: Session = Depends(get_db)):
    """Sahifa ochilganda kerak bo'ladigan hamma narsa bitta so'rovda, rasmlarsiz (ular alohida keladi)."""
    from .meta import cf_out, get_settings, preset_out  # aylanma importdan qochish uchun

    fams = db.scalars(select(models.Family).options(selectinload(models.Family.azolar)).order_by(models.Family.id)).all()
    return etag_json(request, {
        "families": [family_out(f, with_photo=False) for f in fams],
        "customFields": [cf_out(c) for c in db.scalars(select(models.CustomField).order_by(models.CustomField.id))],
        "presets": [preset_out(p) for p in db.scalars(select(models.ExportPreset).order_by(models.ExportPreset.id))],
        "settings": get_settings(db),
    })


@router.get("/photos")
def photos(request: Request, db: Session = Depends(get_db)):
    """Barcha arizachi rasmlari {oila_id: rasm}. Ro'yxat chiqqandan keyin fon rejimida yuklanadi."""
    rows = db.execute(select(models.Family.id, models.Family.rasm).where(models.Family.rasm != "")).all()
    return etag_json(request, {str(i): r for i, r in rows})


@router.get("/families", response_model=list[FamilyOut])
def list_families(db: Session = Depends(get_db)):
    rows = db.scalars(select(models.Family).options(selectinload(models.Family.azolar)).order_by(models.Family.id)).all()
    return [family_out(f) for f in rows]


@router.post("/families", response_model=FamilyOut, status_code=201)
def create_family(data: FamilyCreate, db: Session = Depends(get_db)):
    seen = set()
    for m in data.azolar:
        _unique_jsh(db, m.jshshir)
        if m.jshshir and m.jshshir in seen:
            raise HTTPException(409, "Bir xil JSHSHIR ikki marta kiritilgan")
        seen.add(m.jshshir)
    f = models.Family()
    apply_family(f, data)
    for i, md in enumerate(data.azolar):
        m = models.Member(tartib=i)
        apply_member(m, md)
        f.azolar.append(m)
    db.add(f)
    db.commit()
    return family_out(_family(db, f.id))


@router.put("/families/{fid}", response_model=FamilyOut)
def update_family(fid: int, data: FamilyIn, db: Session = Depends(get_db)):
    f = _family(db, fid)
    apply_family(f, data)
    db.commit()
    return family_out(_family(db, fid))


@router.delete("/families/{fid}", status_code=204)
def delete_family(fid: int, db: Session = Depends(get_db)):
    db.delete(_family(db, fid))
    db.commit()


@router.post("/families/{fid}/members", response_model=MemberOut, status_code=201)
def add_member(fid: int, data: MemberIn, db: Session = Depends(get_db)):
    _family(db, fid)
    _unique_jsh(db, data.jshshir)
    last = db.scalar(select(func.max(models.Member.tartib)).where(models.Member.family_id == fid)) or 0
    m = models.Member(family_id=fid, tartib=last + 1)
    apply_member(m, data)
    db.add(m)
    db.commit()
    return member_out(m)


@router.put("/members/{mid}", response_model=MemberOut)
def update_member(mid: int, data: MemberIn, db: Session = Depends(get_db)):
    m = _member(db, mid)
    _unique_jsh(db, data.jshshir, exclude_id=mid)
    apply_member(m, data)
    db.commit()
    return member_out(m)


@router.delete("/members/{mid}", status_code=204)
def delete_member(mid: int, db: Session = Depends(get_db)):
    db.delete(_member(db, mid))
    db.commit()


@router.post("/members/{mid}/make-head", response_model=FamilyOut)
def make_head(mid: int, db: Session = Depends(get_db)):
    m = _member(db, mid)
    f = _family(db, m.family_id)
    for x in f.azolar:
        if x.id == mid:
            x.qarindoshlik = "Arizachi"
        elif x.qarindoshlik == "Arizachi":
            x.qarindoshlik = "Boshqa"
    db.commit()
    return family_out(_family(db, f.id))
