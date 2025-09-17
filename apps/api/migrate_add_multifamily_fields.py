#!/usr/bin/env python3
"""
Migration script to add multifamily-specific fields to the deals table.
"""

import os
import sys
from sqlmodel import create_engine, Session, text

# Add the parent directory to the path so we can import the models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dealbase.sqlite3")
engine = create_engine(DATABASE_URL)

def add_multifamily_fields():
    """Add multifamily-specific fields to the deals table."""
    print("Adding multifamily fields to deals table...")
    
    with Session(engine) as session:
        try:
            # Check if columns already exist
            result = session.execute(text("PRAGMA table_info(deals)"))
            columns = [row[1] for row in result.fetchall()]
            
            fields_to_add = [
                ("msa", "VARCHAR(255)"),
                ("year_built", "INTEGER"),
                ("unit_count", "INTEGER"),
                ("nsf", "INTEGER"),
                ("deal_tags", "JSON")
            ]
            
            for field_name, field_type in fields_to_add:
                if field_name not in columns:
                    session.execute(text(f"ALTER TABLE deals ADD COLUMN {field_name} {field_type}"))
                    print(f"✓ Added column: {field_name}")
                else:
                    print(f"✓ Column already exists: {field_name}")
            
            session.commit()
            print("✓ Migration completed successfully")
            
        except Exception as e:
            print(f"✗ Error during migration: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    add_multifamily_fields()
