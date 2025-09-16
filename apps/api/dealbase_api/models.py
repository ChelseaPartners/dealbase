"""Database models for DealBase."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import JSON


class DealBase(SQLModel):
    """Base deal model."""

    name: str
    property_type: str
    address: str
    city: str
    state: str
    zip_code: str
    description: Optional[str] = None
    status: str = "draft"  # draft, active, completed, archived


class Deal(DealBase, table=True):
    """Deal model."""

    __tablename__ = "deals"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    valuation_runs: List["ValuationRun"] = Relationship(back_populates="deal")
    t12_data: List["T12Normalized"] = Relationship(back_populates="deal")
    rent_roll_data: List["RentRollNormalized"] = Relationship(back_populates="deal")
    audit_events: List["AuditEvent"] = Relationship(back_populates="deal")


class T12Normalized(SQLModel, table=True):
    """Normalized T-12 data."""

    __tablename__ = "t12_normalized"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    month: int
    year: int
    gross_rent: Decimal = Field(default=Decimal("0"))
    other_income: Decimal = Field(default=Decimal("0"))
    total_income: Decimal = Field(default=Decimal("0"))
    operating_expenses: Decimal = Field(default=Decimal("0"))
    net_operating_income: Decimal = Field(default=Decimal("0"))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    deal: Optional[Deal] = Relationship(back_populates="t12_data")


class RentRollNormalized(SQLModel, table=True):
    """Normalized rent roll data."""

    __tablename__ = "rent_roll_normalized"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    unit_number: str
    unit_type: str
    square_feet: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    rent: Decimal = Field(default=Decimal("0"))
    market_rent: Optional[Decimal] = None
    lease_start: Optional[datetime] = None
    lease_end: Optional[datetime] = None
    tenant_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    deal: Optional[Deal] = Relationship(back_populates="rent_roll_data")


class ValuationRun(SQLModel, table=True):
    """Valuation run model."""

    __tablename__ = "valuation_runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    name: str
    status: str = "pending"  # pending, running, completed, failed
    assumptions: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON)  # JSON field
    results: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON)  # JSON field with KPIs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    # Relationships
    deal: Optional[Deal] = Relationship(back_populates="valuation_runs")


class AuditEvent(SQLModel, table=True):
    """Audit event model."""

    __tablename__ = "audit_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    event_type: str  # created, updated, valuation_run, export, etc.
    description: str
    event_metadata: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON)  # JSON field
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    deal: Optional[Deal] = Relationship(back_populates="audit_events")
