/*
# Omni Knowledge Maker - Core Schema

1. New Tables
- `knowledge_packages` — Top-level knowledge containers (portfolio, apartments, company, etc.)
  - id (uuid, PK), name, slug, description, type, status, color, icon, sources_count, facts_count, version, created_at, updated_at
- `knowledge_sources` — Uploaded source files within a package
  - id (uuid, PK), package_id (FK), filename, file_type, file_size, normalized_name, normalized_content, status, created_at
- `knowledge_assets` — Generated knowledge assets (facts.json, entities.json, etc.)
  - id (uuid, PK), package_id (FK), asset_type, asset_data (jsonb), created_at, updated_at
- `processing_jobs` — Tracks the processing pipeline state for a package
  - id (uuid, PK), package_id (FK), stage, progress, status, log (jsonb), created_at, updated_at

2. Security
- Single-tenant app (no auth). Enable RLS on all tables.
- Allow anon + authenticated CRUD on all tables since data is intentionally shared/public.
*/ 

CREATE TABLE IF NOT EXISTS knowledge_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'draft',
  color text NOT NULL DEFAULT '#0891b2',
  icon text NOT NULL DEFAULT 'Package',
  sources_count integer NOT NULL DEFAULT 0,
  facts_count integer NOT NULL DEFAULT 0,
  version text NOT NULL DEFAULT '1.0.0',
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_packages" ON knowledge_packages;
CREATE POLICY "anon_select_packages" ON knowledge_packages FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_packages" ON knowledge_packages;
CREATE POLICY "anon_insert_packages" ON knowledge_packages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_packages" ON knowledge_packages;
CREATE POLICY "anon_update_packages" ON knowledge_packages FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_packages" ON knowledge_packages;
CREATE POLICY "anon_delete_packages" ON knowledge_packages FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES knowledge_packages(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  normalized_name text,
  normalized_content text,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sources" ON knowledge_sources;
CREATE POLICY "anon_select_sources" ON knowledge_sources FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sources" ON knowledge_sources;
CREATE POLICY "anon_insert_sources" ON knowledge_sources FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sources" ON knowledge_sources;
CREATE POLICY "anon_update_sources" ON knowledge_sources FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sources" ON knowledge_sources;
CREATE POLICY "anon_delete_sources" ON knowledge_sources FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS knowledge_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES knowledge_packages(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(package_id, asset_type)
);

ALTER TABLE knowledge_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_assets" ON knowledge_assets;
CREATE POLICY "anon_select_assets" ON knowledge_assets FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_assets" ON knowledge_assets;
CREATE POLICY "anon_insert_assets" ON knowledge_assets FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_assets" ON knowledge_assets;
CREATE POLICY "anon_update_assets" ON knowledge_assets FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_assets" ON knowledge_assets;
CREATE POLICY "anon_delete_assets" ON knowledge_assets FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES knowledge_packages(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'idle',
  progress integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'idle',
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_jobs" ON processing_jobs;
CREATE POLICY "anon_select_jobs" ON processing_jobs FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_jobs" ON processing_jobs;
CREATE POLICY "anon_insert_jobs" ON processing_jobs FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_jobs" ON processing_jobs;
CREATE POLICY "anon_update_jobs" ON processing_jobs FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_jobs" ON processing_jobs;
CREATE POLICY "anon_delete_jobs" ON processing_jobs FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sources_package ON knowledge_sources(package_id);
CREATE INDEX IF NOT EXISTS idx_assets_package ON knowledge_assets(package_id);
CREATE INDEX IF NOT EXISTS idx_jobs_package ON processing_jobs(package_id);
