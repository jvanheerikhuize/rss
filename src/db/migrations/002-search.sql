CREATE VIRTUAL TABLE articles_fts USING fts5(
    title,
    content,
    content=articles,
    content_rowid=id,
    tokenize='porter unicode61'
);

CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, content)
    VALUES (new.id, new.title, COALESCE(new.extracted_content, new.content, new.summary, ''));
END;

CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
    INSERT INTO articles_fts(articles_fts, rowid, title, content)
    VALUES ('delete', old.id, old.title, COALESCE(old.extracted_content, old.content, old.summary, ''));
END;

CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
    INSERT INTO articles_fts(articles_fts, rowid, title, content)
    VALUES ('delete', old.id, old.title, COALESCE(old.extracted_content, old.content, old.summary, ''));
    INSERT INTO articles_fts(rowid, title, content)
    VALUES (new.id, new.title, COALESCE(new.extracted_content, new.content, new.summary, ''));
END;
