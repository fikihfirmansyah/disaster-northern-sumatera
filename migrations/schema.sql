-- Instagram accounts table
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_url TEXT NOT NULL UNIQUE,
  account_username TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_scraped_at DATETIME,
  is_active INTEGER DEFAULT 1
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  post_url TEXT NOT NULL UNIQUE,
  image_url TEXT,
  image_r2_key TEXT,
  text TEXT,
  location_text TEXT,
  latitude REAL,
  longitude REAL,
  timestamp DATETIME,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES instagram_accounts(id)
);

-- AI Analysis table
CREATE TABLE IF NOT EXISTS ai_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK(severity IN ('Parah', 'Sedang', 'Aman')),
  category TEXT NOT NULL,
  urgent_needs TEXT,
  disaster_type TEXT,
  location_extracted TEXT,
  confidence REAL,
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Locations table (for caching geocoded locations)
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_name TEXT NOT NULL UNIQUE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  region TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_account_id ON posts(account_id);
CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_severity ON ai_analysis(severity);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_category ON ai_analysis(category);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(latitude, longitude);

