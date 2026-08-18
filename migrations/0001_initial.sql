CREATE TABLE establishments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT,
  address TEXT,
  locality TEXT,
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  identity_confidence TEXT NOT NULL CHECK (identity_confidence IN ('exact', 'partial')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inspection_events (
  id TEXT PRIMARY KEY,
  establishment_id TEXT NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  inspection_date TEXT NOT NULL,
  authority TEXT NOT NULL,
  finding_summary TEXT NOT NULL,
  action_summary TEXT NOT NULL,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('inspection', 'notice', 'seizure', 'closure', 'satisfactory')),
  current_status TEXT NOT NULL DEFAULT 'No later status sourced',
  evidence_grade TEXT NOT NULL CHECK (evidence_grade IN ('official', 'reported')),
  reviewed_at TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  published_at TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'news')),
  accessed_at TEXT NOT NULL
);

CREATE TABLE event_sources (
  event_id TEXT NOT NULL REFERENCES inspection_events(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'corroborating')),
  claim_note TEXT NOT NULL,
  PRIMARY KEY (event_id, source_id)
);

CREATE INDEX idx_events_published_date ON inspection_events(is_published, inspection_date DESC);
CREATE INDEX idx_events_establishment ON inspection_events(establishment_id);
CREATE INDEX idx_event_sources_event ON event_sources(event_id);
