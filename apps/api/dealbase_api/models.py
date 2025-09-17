"""Database models for DealBase."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import JSON, Column


class DealBase(SQLModel):
    """Base deal model."""

    name: str
    slug: str  # URL-friendly identifier
    property_type: str
    address: str
    city: str
    state: str
    zip_code: str
    description: Optional[str] = None
    status: str = "draft"  # draft, active, completed, archived
    # Multifamily-specific fields
    msa: Optional[str] = None  # Metropolitan Statistical Area
    year_built: Optional[int] = None
    unit_count: Optional[int] = None  # Number of units
    nsf: Optional[int] = None  # Net Square Feet (Average Unit SF)
    deal_tags: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))  # Array of deal tags


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
    documents: List["DealDocument"] = Relationship(back_populates="deal")


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
    """Normalized rent roll data with comprehensive unit information."""

    __tablename__ = "rent_roll_normalized"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    
    # Core unit identification
    unit_number: str = Field(index=True)  # e.g., "101", "A-201"
    unit_label: Optional[str] = None  # e.g., "1BR Premium", "2BR Corner"
    
    # Physical characteristics
    unit_type: str  # e.g., "1BR", "2BR", "Studio"
    square_feet: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    
    # Rent information (actual/in-place rent as primary)
    rent: Decimal = Field(default=Decimal("0"))  # Legacy rent field for compatibility
    actual_rent: Decimal = Field(default=Decimal("0"))  # Current rent being paid
    market_rent: Decimal = Field(default=Decimal("0"))  # Market rate for unit
    
    # Lease timing
    lease_start: Optional[datetime] = None  # Original lease start
    move_in_date: Optional[datetime] = None  # Actual move-in date
    lease_expiration: Optional[datetime] = None  # Current lease end
    
    # Tenant information
    tenant_name: Optional[str] = None
    lease_status: str = Field(default="occupied")  # occupied, vacant, notice_to_vacate
    
    # Data quality flags
    is_duplicate: bool = Field(default=False)  # Flag for duplicate handling
    is_application: bool = Field(default=False)  # Flag for future applications
    data_source: str = Field(default="upload")  # upload, manual_entry, import
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    deal: Optional[Deal] = Relationship(back_populates="rent_roll_data")


class UnitMixSummary(SQLModel, table=True):
    """Aggregated unit mix data by unit type."""

    __tablename__ = "unit_mix_summary"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    
    # Unit type classification
    unit_type: str = Field(index=True)  # e.g., "1BR", "2BR", "Studio"
    unit_label: Optional[str] = None  # Custom label for display
    
    # Aggregated counts
    total_units: int = Field(default=0)
    occupied_units: int = Field(default=0)
    vacant_units: int = Field(default=0)
    
    # Physical characteristics (averages)
    avg_square_feet: Optional[int] = None
    avg_bedrooms: Optional[float] = None
    avg_bathrooms: Optional[float] = None
    
    # Rent analysis
    avg_actual_rent: Decimal = Field(default=Decimal("0"))
    avg_market_rent: Decimal = Field(default=Decimal("0"))
    rent_premium: Decimal = Field(default=Decimal("0"))  # actual vs market
    
    # Pro forma assumptions (user input)
    pro_forma_rent: Optional[Decimal] = None  # User-set target rent
    rent_growth_rate: Optional[Decimal] = None  # Annual growth assumption
    
    # Derived metrics
    total_square_feet: Optional[int] = None
    total_actual_rent: Decimal = Field(default=Decimal("0"))
    total_market_rent: Decimal = Field(default=Decimal("0"))
    total_pro_forma_rent: Decimal = Field(default=Decimal("0"))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    deal: Optional[Deal] = Relationship()


class RentRollAssumptions(SQLModel, table=True):
    """User-defined assumptions for rent roll analysis."""

    __tablename__ = "rent_roll_assumptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    
    # Pro forma rent assumptions by unit type
    pro_forma_rents: Dict[str, Decimal] = Field(default_factory=dict, sa_type=JSON)
    
    # Market assumptions
    market_rent_growth: Decimal = Field(default=Decimal("0.03"))  # 3% annual growth
    vacancy_rate: Decimal = Field(default=Decimal("0.05"))  # 5% vacancy
    turnover_rate: Decimal = Field(default=Decimal("0.20"))  # 20% annual turnover
    
    # Lease assumptions
    avg_lease_term: int = Field(default=12)  # months
    lease_renewal_rate: Decimal = Field(default=Decimal("0.70"))  # 70% renewal
    
    # Operating assumptions
    marketing_cost_per_unit: Decimal = Field(default=Decimal("500"))
    turnover_cost_per_unit: Decimal = Field(default=Decimal("2000"))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    deal: Optional[Deal] = Relationship()


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


class DealDocument(SQLModel, table=True):
    """Raw documents uploaded for deals."""
    
    __tablename__ = "deal_documents"

    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deals.id")
    
    # Document metadata
    filename: str = Field(index=True)
    original_filename: str  # Keep original name for display
    file_type: str  # 'rent_roll', 't12', etc.
    file_size: int  # Size in bytes
    content_type: str  # MIME type
    
    # File storage
    file_path: str  # Path to stored file
    file_hash: Optional[str] = None  # For deduplication
    
    # Processing status
    processing_status: str = Field(default="pending")  # pending, processing, completed, failed
    processing_error: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    deal: Optional[Deal] = Relationship(back_populates="documents")
