-- Migration: Add processing metrics to deal_documents table
-- This migration adds fields to track processing performance and metrics

-- Add new columns to deal_documents table
ALTER TABLE deal_documents 
ADD COLUMN processing_started_at TIMESTAMP NULL,
ADD COLUMN processing_completed_at TIMESTAMP NULL,
ADD COLUMN records_processed INTEGER NULL,
ADD COLUMN issues_found INTEGER NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_file_hash ON deal_documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_deal_documents_processing_status ON deal_documents(processing_status);

-- Add comments for documentation
COMMENT ON COLUMN deal_documents.processing_started_at IS 'Timestamp when processing actually began';
COMMENT ON COLUMN deal_documents.processing_completed_at IS 'Timestamp when processing finished';
COMMENT ON COLUMN deal_documents.records_processed IS 'Number of units processed from the document';
COMMENT ON COLUMN deal_documents.issues_found IS 'Number of data quality issues found during processing';
