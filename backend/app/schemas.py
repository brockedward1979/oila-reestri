from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Toifa = Literal["kambagal", "chegara", "davlat"]


def parse_dmy(s: str | None) -> date | None:
    """'dd.mm.yyyy' -> date. Bo'sh yoki noto'g'ri bo'lsa None."""
    if not s:
        return None
    try:
        return datetime.strptime(s.strip(), "%d.%m.%Y").date()
    except ValueError:
        return None


def fmt_dmy(d: date | None) -> str:
    return d.strftime("%d.%m.%Y") if d else ""


class MemberIn(BaseModel):
    fio: str = Field(min_length=1, max_length=200)
    qarindoshlik: str = ""
    jshshir: str = ""
    tugilganSana: str = ""
    jinsi: str = ""
    holat: list[str] = []
    nogironlik: str = ""
    oquvJoyi: str = ""
    sinf: str = ""
    ishJoyi: str = ""
    telefon: str = ""
    izoh: str = ""
    extra: dict = {}

    @field_validator("fio")
    @classmethod
    def _fio(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("F.I.Sh. bo‘sh bo‘lmasin")
        return v

    @field_validator("jshshir")
    @classmethod
    def _jsh(cls, v: str) -> str:
        v = (v or "").strip()
        if v and (not v.isdigit() or len(v) != 14):
            raise ValueError("JSHSHIR 14 ta raqamdan iborat bo‘lishi kerak")
        return v

    @field_validator("tugilganSana")
    @classmethod
    def _dob(cls, v: str) -> str:
        if v and parse_dmy(v) is None:
            raise ValueError("Sana dd.mm.yyyy ko‘rinishida bo‘lishi kerak")
        return v


class MemberOut(MemberIn):
    id: int


class FamilyIn(BaseModel):
    mahalla: str = ""
    toifa: Toifa = "kambagal"
    telefon: str = ""
    manzil: str = ""
    hujjatRaqami: str = ""
    reyestrSana: str = ""
    savolnomaId: str = ""
    daromad: int = 0
    izoh: str = ""
    rasm: str | None = None  # None = rasmga tegilmaydi (ro'yxat rasmsiz yuklanganda kerak)
    extra: dict = {}

    @field_validator("rasm")
    @classmethod
    def _rasm(cls, v: str | None) -> str | None:
        if v and (not v.startswith("data:image/") or len(v) > 1_500_000):
            raise ValueError("Rasm noto‘g‘ri yoki juda katta")
        return v

    @field_validator("reyestrSana")
    @classmethod
    def _reg(cls, v: str) -> str:
        if v and parse_dmy(v) is None:
            raise ValueError("Sana dd.mm.yyyy ko‘rinishida bo‘lishi kerak")
        return v


class FamilyCreate(FamilyIn):
    azolar: list[MemberIn] = []


class FamilyOut(FamilyIn):
    id: int
    hasRasm: bool = False
    azolar: list[MemberOut]


class CustomFieldIn(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    scope: Literal["oila", "azo"]
    type: Literal["text", "number", "date", "select"] = "text"
    options: list[str] = []


class CustomFieldOut(CustomFieldIn):
    id: int


class PresetIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    mode: Literal["oila", "azo"] = "oila"
    titleCase: bool = True
    cols: list[str] = []


class PresetOut(PresetIn):
    id: int


class LoginIn(BaseModel):
    username: str
    password: str
