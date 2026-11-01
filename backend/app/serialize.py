from . import models
from .schemas import FamilyIn, MemberIn, fmt_dmy, parse_dmy


def member_out(m: models.Member) -> dict:
    return {
        "id": m.id, "fio": m.fio, "qarindoshlik": m.qarindoshlik, "jshshir": m.jshshir,
        "tugilganSana": fmt_dmy(m.tugilgan_sana), "jinsi": m.jinsi, "holat": m.holat or [],
        "nogironlik": m.nogironlik, "oquvJoyi": m.oquv_joyi, "sinf": m.sinf, "ishJoyi": m.ish_joyi,
        "telefon": m.telefon, "izoh": m.izoh, "extra": m.extra or {},
    }


def family_out(f: models.Family) -> dict:
    return {
        "id": f.id, "mahalla": f.mahalla, "toifa": f.toifa, "telefon": f.telefon, "manzil": f.manzil,
        "hujjatRaqami": f.hujjat_raqami, "reyestrSana": fmt_dmy(f.reyestr_sana), "savolnomaId": f.savolnoma_id,
        "daromad": f.daromad or 0, "izoh": f.izoh, "rasm": f.rasm, "extra": f.extra or {},
        "azolar": [member_out(m) for m in f.azolar],
    }


def apply_member(m: models.Member, d: MemberIn) -> None:
    m.fio = d.fio
    m.qarindoshlik = d.qarindoshlik
    m.jshshir = d.jshshir
    m.tugilgan_sana = parse_dmy(d.tugilganSana)
    m.jinsi = d.jinsi
    m.holat = list(dict.fromkeys(t.strip() for t in d.holat if t.strip()))
    m.nogironlik = d.nogironlik
    m.oquv_joyi = d.oquvJoyi
    m.sinf = d.sinf
    m.ish_joyi = d.ishJoyi
    m.telefon = d.telefon
    m.izoh = d.izoh
    m.extra = d.extra


def apply_family(f: models.Family, d: FamilyIn) -> None:
    f.mahalla = d.mahalla
    f.toifa = d.toifa
    f.telefon = d.telefon
    f.manzil = d.manzil
    f.hujjat_raqami = d.hujjatRaqami
    f.reyestr_sana = parse_dmy(d.reyestrSana)
    f.savolnoma_id = d.savolnomaId
    f.daromad = d.daromad
    f.izoh = d.izoh
    f.rasm = d.rasm
    f.extra = d.extra
