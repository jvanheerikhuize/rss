import { Router } from 'express';
import { getDb } from '../db/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const folders = db.prepare(`
    SELECT f.*,
      COALESCE(SUM(fe.unread_count), 0) as total_unread
    FROM folders f
    LEFT JOIN feeds fe ON fe.folder_id = f.id
    GROUP BY f.id
    ORDER BY f.sort_order, f.name
  `).all();
  res.json(folders);
});

router.post('/', (req, res) => {
  const { name, parentId } = req.body;
  if (!name) throw new ValidationError('Folder name is required');

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO folders (name, parent_id) VALUES (?, ?)'
  ).run(name, parentId || null);

  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(folder);
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
  if (!folder) throw new NotFoundError('Folder not found');

  const { name, parentId, sortOrder } = req.body;
  db.prepare(`
    UPDATE folders SET
      name = COALESCE(?, name),
      parent_id = COALESCE(?, parent_id),
      sort_order = COALESCE(?, sort_order),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(name || null, parentId !== undefined ? parentId : null, sortOrder ?? null, req.params.id);

  const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
  if (!folder) throw new NotFoundError('Folder not found');

  // Move feeds to uncategorized
  db.prepare('UPDATE feeds SET folder_id = NULL WHERE folder_id = ?').run(req.params.id);
  db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
