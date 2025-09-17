#!/usr/bin/env python3
"""Migration script to add deal_documents table."""

import sqlite3
from pathlib import Path

def migrate():
    """Add deal_documents table to the database."""
    
    # Database path
    db_path = Path(__file__).parent / "dealbase.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create deal_documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deal_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deal_id INTEGER NOT NULL,
                filename VARCHAR NOT NULL,
                original_filename VARCHAR NOT NULL,
                file_type VARCHAR NOT NULL,
                file_size INTEGER NOT NULL,
                content_type VARCHAR NOT NULL,
                file_path VARCHAR NOT NULL,
                file_hash VARCHAR,
                processing_status VARCHAR DEFAULT 'pending',
                processing_error VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (deal_id) REFERENCES deals (id)
            )
        """)
        
        # Create index on filename
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_deal_documents_filename ON deal_documents (filename)
        """)
        
        # Create index on deal_id
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_deal_documents_deal_id ON deal_documents (deal_id)
        """)
        
        conn.commit()
        print("✅ Successfully added deal_documents table and indexes")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
