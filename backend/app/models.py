from datetime import date, datetime

from sqlalchemy import JSON, BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

JSONType = JSON().with_variant(JSONB(), "postgresql")


class Family(Base):
    __tablename__ = "families"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mahalla: Mapped[str] = mapped_column(String(120), default="")
    toifa: Mapped[str] = mapped_column(String(20), default="kambagal", index=True)
    telefon: Mapped[str] = mapped_column(String(40), default="")
    manzil: Mapped[str] = mapped_column(String(300), default="")
    hujjat_raqami: Mapped[str] = mapped_column(String(40), default="")
    reyestr_sana: Mapped[date | None] = mapped_column(Date, nullable=True)
    savolnoma_id: Mapped[str] = mapped_column(String(40), default="")
    daromad: Mapped[int] = mapped_column(BigInteger, default=0)
    izoh: Mapped[str] = mapped_column(Text, default="")
    rasm: Mapped[str] = mapped_column(Text, default="")  # data:image/jpeg;base64,...
    extra: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    azolar: Mapped[list["Member"]] = relationship(
        back_populates="family", cascade="all, delete-orphan", order_by="Member.tartib"
    )


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    tartib: Mapped[int] = mapped_column(Integer, default=0)
    fio: Mapped[str] = mapped_column(String(200))
    qarindoshlik: Mapped[str] = mapped_column(String(80), default="")
    jshshir: Mapped[str] = mapped_column(String(14), default="", index=True)
    tugilgan_sana: Mapped[date | None] = mapped_column(Date, nullable=True)
    jinsi: Mapped[str] = mapped_column(String(10), default="")
    holat: Mapped[list] = mapped_column(JSONType, default=list)
    nogironlik: Mapped[str] = mapped_column(String(60), default="")
    oquv_joyi: Mapped[str] = mapped_column(String(200), default="")
    sinf: Mapped[str] = mapped_column(String(40), default="")
    ish_joyi: Mapped[str] = mapped_column(String(200), default="")
    telefon: Mapped[str] = mapped_column(String(40), default="")
    izoh: Mapped[str] = mapped_column(Text, default="")
    extra: Mapped[dict] = mapped_column(JSONType, default=dict)

    family: Mapped[Family] = relationship(back_populates="azolar")


class CustomField(Base):
    __tablename__ = "custom_fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(120))
    scope: Mapped[str] = mapped_column(String(10))  # "oila" yoki "azo"
    type: Mapped[str] = mapped_column(String(10), default="text")
    options: Mapped[list] = mapped_column(JSONType, default=list)


class ExportPreset(Base):
    __tablename__ = "export_presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    mode: Mapped[str] = mapped_column(String(10), default="oila")
    title_case: Mapped[bool] = mapped_column(Boolean, default=True)
    cols: Mapped[list] = mapped_column(JSONType, default=list)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONType, default=dict)
