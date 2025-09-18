#!/usr/bin/env python3
"""Migration script to add processing columns to deal_documents table."""

import sqlite3
from pathlib import Path

def migrate():
    """Add processing columns to deal_documents table."""
    
    # Database path
    db_path = Path(__file__).parent / "dealbase.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(deal_documents)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add missing columns
        columns_to_add = [
            ("processing_started_at", "DATETIME"),
            ("processing_completed_at", "DATETIME"),
            ("records_processed", "INTEGER"),
            ("issues_found", "INTEGER")
        ]
        
        for column_name, column_type in columns_to_add:
            if column_name not in columns:
                cursor.execute(f"ALTER TABLE deal_documents ADD COLUMN {column_name} {column_type}")
                print(f"✅ Added column: {column_name}")
            else:
                print(f"⏭️  Column already exists: {column_name}")
        
        conn.commit()
        print("✅ Successfully added processing columns to deal_documents table")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
