#!/usr/bin/env python3
"""Migration script to add slugs to existing deals."""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dealbase_api.database import get_session
from dealbase_api.models import Deal
from dealbase_api.utils import create_deal_slug
from sqlalchemy import text


def migrate_add_slugs():
    """Add slug column and populate it for existing deals."""
    session = next(get_session())
    
    try:
        # Add slug column if it doesn't exist
        print("Adding slug column...")
        session.exec(text("ALTER TABLE deals ADD COLUMN slug VARCHAR(255)"))
        session.commit()
        print("✓ Slug column added")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print("✓ Slug column already exists")
        else:
            print(f"Error adding slug column: {e}")
            return False
    
    # Get all deals without slugs
    deals_without_slugs = session.exec(
        text("SELECT id, name FROM deals WHERE slug IS NULL OR slug = ''")
    ).all()
    
    print(f"Found {len(deals_without_slugs)} deals without slugs")
    
    # Generate slugs for each deal
    for deal_id, deal_name in deals_without_slugs:
        try:
            slug = create_deal_slug(session, deal_name, deal_id)
            session.execute(
                text("UPDATE deals SET slug = :slug WHERE id = :deal_id"),
                {"slug": slug, "deal_id": deal_id}
            )
            print(f"✓ Generated slug '{slug}' for deal '{deal_name}' (ID: {deal_id})")
        except Exception as e:
            print(f"✗ Error generating slug for deal '{deal_name}' (ID: {deal_id}): {e}")
    
    session.commit()
    print("✓ Migration completed successfully")
    return True


if __name__ == "__main__":
    migrate_add_slugs()
