"""Utility functions for DealBase."""

import re
import unicodedata
from typing import Optional
from sqlmodel import Session, select
from .models import Deal


def generate_slug(text: str) -> str:
    """Generate a URL-safe slug from text."""
    # Convert to lowercase
    text = text.lower()
    
    # Remove accents and normalize unicode
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    
    # Replace spaces and special characters with hyphens
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    # Ensure it's not empty
    if not text:
        text = 'deal'
    
    return text


def ensure_unique_slug(session: Session, base_slug: str, deal_id: Optional[int] = None) -> str:
    """Ensure the slug is unique by appending a number if needed."""
    slug = base_slug
    counter = 1
    
    while True:
        # Check if slug exists (excluding current deal if updating)
        query = select(Deal).where(Deal.slug == slug)
        if deal_id:
            query = query.where(Deal.id != deal_id)
        
        existing_deal = session.exec(query).first()
        
        if not existing_deal:
            return slug
        
        # Slug exists, try with counter
        slug = f"{base_slug}-{counter}"
        counter += 1


def create_deal_slug(session: Session, deal_name: str, deal_id: Optional[int] = None) -> str:
    """Create a unique slug for a deal."""
    base_slug = generate_slug(deal_name)
    return ensure_unique_slug(session, base_slug, deal_id)


def log_audit_event(deal_id: int, event_type: str, description: str, metadata: dict = None):
    """Log audit event for compliance tracking."""
    from .models import AuditEvent
    
    # This is a simplified version - in production, you'd want to inject the session
    # For now, we'll just print the audit event
    print(f"AUDIT EVENT: Deal {deal_id} - {event_type}: {description}")
    if metadata:
        print(f"  Metadata: {metadata}")
