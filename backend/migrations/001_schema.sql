-- ─── Virtual Try-On Database Schema ─────────────
-- Run this in Supabase SQL Editor

-- Products table (catalog)
CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mrp NUMERIC NOT NULL DEFAULT 0,
    color TEXT DEFAULT '',
    fabric TEXT DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    sub_category TEXT DEFAULT '',
    occasion TEXT DEFAULT '',
    style_vibe TEXT DEFAULT '',
    color_family TEXT DEFAULT '',
    silhouette TEXT DEFAULT '',
    body_types TEXT DEFAULT '',
    fit_note TEXT DEFAULT '',
    pairs_with TEXT DEFAULT '',
    styling_note TEXT DEFAULT '',
    season TEXT DEFAULT '',
    fashn_category TEXT DEFAULT 'auto',
    dataset TEXT DEFAULT 'shopify',
    image_url TEXT NOT NULL,
    clean_image_url TEXT DEFAULT '',
    has_clean BOOLEAN DEFAULT false,
    shopify_handle TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_dataset ON products(dataset);

-- User sessions (persistent across devices)
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Try-on history
CREATE TABLE IF NOT EXISTS tryon_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    outfit_id TEXT NOT NULL,
    outfit_name TEXT NOT NULL,
    outfit_image TEXT NOT NULL,
    result_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    hairstyle TEXT,
    makeup TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_session ON tryon_history(session_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON tryon_history(created_at DESC);

-- Comparisons
CREATE TABLE IF NOT EXISTS comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tryon_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comparisons_session ON comparisons(session_id);

-- Row Level Security (RLS) — disabled for now since we use service_role key
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE tryon_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE comparisons DISABLE ROW LEVEL SECURITY;
