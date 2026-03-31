CREATE TABLE folders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    parent_id   INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE feeds (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id        INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    url              TEXT NOT NULL UNIQUE,
    site_url         TEXT,
    description      TEXT,
    favicon_url      TEXT,
    refresh_interval INTEGER DEFAULT 1800,
    last_fetched_at  TEXT,
    last_error       TEXT,
    error_count      INTEGER DEFAULT 0,
    etag             TEXT,
    last_modified    TEXT,
    article_count    INTEGER DEFAULT 0,
    unread_count     INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE articles (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id              INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    guid                 TEXT NOT NULL,
    title                TEXT NOT NULL,
    original_title       TEXT,
    url                  TEXT,
    author               TEXT,
    summary              TEXT,
    content              TEXT,
    extracted_content    TEXT,
    word_count           INTEGER,
    reading_time_minutes INTEGER,
    is_read              INTEGER DEFAULT 0,
    is_starred           INTEGER DEFAULT 0,
    reading_position     REAL DEFAULT 0,
    published_at         TEXT,
    fetched_at           TEXT DEFAULT (datetime('now')),
    read_at              TEXT,
    created_at           TEXT DEFAULT (datetime('now')),
    UNIQUE(feed_id, guid)
);

CREATE INDEX idx_articles_feed_id ON articles(feed_id);
CREATE INDEX idx_articles_is_read ON articles(is_read);
CREATE INDEX idx_articles_is_starred ON articles(is_starred);
CREATE INDEX idx_articles_published_at ON articles(published_at);

CREATE TABLE saved_searches (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    query      TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
