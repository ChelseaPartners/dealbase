#!/usr/bin/env python3
"""Migration script to add enhanced rent roll tables and update existing schema."""

import sqlite3
import sys
from pathlib import Path

def migrate_database():
    """Run database migration for enhanced rent roll system."""
    
    # Database path
    db_path = Path(__file__).parent / "dealbase.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        print("Starting enhanced rent roll migration...")
        
        # 1. Update existing rent_roll_normalized table
        print("Updating rent_roll_normalized table...")
        
        # Check if new columns exist
        cursor.execute("PRAGMA table_info(rent_roll_normalized)")
        columns = [col[1] for col in cursor.fetchall()]
        
        new_columns = [
            ("unit_label", "TEXT"),
            ("actual_rent", "DECIMAL DEFAULT 0"),
            ("market_rent", "DECIMAL DEFAULT 0"),
            ("move_in_date", "DATETIME"),
            ("lease_status", "TEXT DEFAULT 'occupied'"),
            ("is_duplicate", "BOOLEAN DEFAULT 0"),
            ("is_application", "BOOLEAN DEFAULT 0"),
            ("data_source", "TEXT DEFAULT 'upload'"),
            ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                cursor.execute(f"ALTER TABLE rent_roll_normalized ADD COLUMN {col_name} {col_type}")
                print(f"  Added column: {col_name}")
        
        # Update existing rent column to actual_rent if it exists
        if 'rent' in columns and 'actual_rent' in columns:
            cursor.execute("UPDATE rent_roll_normalized SET actual_rent = rent WHERE actual_rent = 0")
            print("  Migrated existing rent data to actual_rent")
        
        # 2. Create unit_mix_summary table
        print("Creating unit_mix_summary table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS unit_mix_summary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deal_id INTEGER NOT NULL,
                unit_type TEXT NOT NULL,
                unit_label TEXT,
                total_units INTEGER DEFAULT 0,
                occupied_units INTEGER DEFAULT 0,
                vacant_units INTEGER DEFAULT 0,
                avg_square_feet INTEGER,
                avg_bedrooms REAL,
                avg_bathrooms REAL,
                avg_actual_rent DECIMAL DEFAULT 0,
                avg_market_rent DECIMAL DEFAULT 0,
                rent_premium DECIMAL DEFAULT 0,
                pro_forma_rent DECIMAL,
                rent_growth_rate DECIMAL,
                total_square_feet INTEGER,
                total_actual_rent DECIMAL DEFAULT 0,
                total_market_rent DECIMAL DEFAULT 0,
                total_pro_forma_rent DECIMAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (deal_id) REFERENCES deals (id)
            )
        """)
        
        # 3. Create rent_roll_assumptions table
        print("Creating rent_roll_assumptions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rent_roll_assumptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deal_id INTEGER NOT NULL,
                pro_forma_rents TEXT, -- JSON field
                market_rent_growth DECIMAL DEFAULT 0.03,
                vacancy_rate DECIMAL DEFAULT 0.05,
                turnover_rate DECIMAL DEFAULT 0.20,
                avg_lease_term INTEGER DEFAULT 12,
                lease_renewal_rate DECIMAL DEFAULT 0.70,
                marketing_cost_per_unit DECIMAL DEFAULT 500,
                turnover_cost_per_unit DECIMAL DEFAULT 2000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (deal_id) REFERENCES deals (id)
            )
        """)
        
        # 4. Create indexes for performance
        print("Creating indexes...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_unit_mix_summary_deal_id ON unit_mix_summary(deal_id)",
            "CREATE INDEX IF NOT EXISTS idx_unit_mix_summary_unit_type ON unit_mix_summary(unit_type)",
            "CREATE INDEX IF NOT EXISTS idx_rent_roll_assumptions_deal_id ON rent_roll_assumptions(deal_id)",
            "CREATE INDEX IF NOT EXISTS idx_rent_roll_normalized_deal_id ON rent_roll_normalized(deal_id)",
            "CREATE INDEX IF NOT EXISTS idx_rent_roll_normalized_unit_number ON rent_roll_normalized(unit_number)",
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        # 5. Migrate existing rent roll data to new format
        print("Migrating existing rent roll data...")
        
        # Check if there's existing rent roll data to migrate
        cursor.execute("SELECT COUNT(*) FROM rent_roll_normalized")
        existing_count = cursor.fetchone()[0]
        
        if existing_count > 0:
            print(f"  Found {existing_count} existing rent roll records")
            
            # Update existing records with default values
            cursor.execute("""
                UPDATE rent_roll_normalized 
                SET 
                    lease_status = 'occupied',
                    is_duplicate = 0,
                    is_application = 0,
                    data_source = 'migration',
                    updated_at = CURRENT_TIMESTAMP
                WHERE lease_status IS NULL
            """)
            
            # Set market_rent = actual_rent if market_rent is 0
            cursor.execute("""
                UPDATE rent_roll_normalized 
                SET market_rent = actual_rent 
                WHERE market_rent = 0 AND actual_rent > 0
            """)
            
            print("  Updated existing records with default values")
        
        # 6. Generate initial unit mix summaries for existing deals
        print("Generating initial unit mix summaries...")
        
        # Get all deals with rent roll data
        cursor.execute("""
            SELECT DISTINCT deal_id FROM rent_roll_normalized
        """)
        deal_ids = [row[0] for row in cursor.fetchall()]
        
        for deal_id in deal_ids:
            # Generate unit mix summary for this deal
            cursor.execute("""
                INSERT INTO unit_mix_summary (
                    deal_id, unit_type, unit_label, total_units, occupied_units, vacant_units,
                    avg_square_feet, avg_bedrooms, avg_bathrooms,
                    avg_actual_rent, avg_market_rent, rent_premium,
                    total_square_feet, total_actual_rent, total_market_rent, total_pro_forma_rent
                )
                SELECT 
                    deal_id,
                    unit_type,
                    unit_type as unit_label,
                    COUNT(*) as total_units,
                    COUNT(CASE WHEN lease_status = 'occupied' THEN 1 END) as occupied_units,
                    COUNT(CASE WHEN lease_status != 'occupied' THEN 1 END) as vacant_units,
                    AVG(square_feet) as avg_square_feet,
                    AVG(bedrooms) as avg_bedrooms,
                    AVG(bathrooms) as avg_bathrooms,
                    AVG(actual_rent) as avg_actual_rent,
                    AVG(market_rent) as avg_market_rent,
                    AVG(actual_rent) - AVG(market_rent) as rent_premium,
                    SUM(square_feet) as total_square_feet,
                    SUM(actual_rent) as total_actual_rent,
                    SUM(market_rent) as total_market_rent,
                    SUM(market_rent) as total_pro_forma_rent
                FROM rent_roll_normalized 
                WHERE deal_id = ?
                GROUP BY deal_id, unit_type
            """, (deal_id,))
            
            print(f"  Generated unit mix summary for deal {deal_id}")
        
        # Commit all changes
        conn.commit()
        print("Migration completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
