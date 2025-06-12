import express from 'express';
import { pool } from '../db/db';


const router = express.Router();


router.post('/', async (req, res) => {
  const { path, method, statusCode, contentType, responseBody } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO fake_api_rules (path, method, statusCode, contentType, responseBody)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [path, method, statusCode, contentType, responseBody]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Insert failed', details: err.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fake_api_rules');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fake_api_rules WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).send('Not found');
    res.json(result.rows[0]);
  } catch {
    res.status(500).send('Error fetching rule');
  }
});

router.put('/:id', async (req, res) => {
  const { path, method, statusCode, contentType, responseBody } = req.body;
  const id = req.params.id;
  try {
    const result = await pool.query(`
      UPDATE fake_api_rules SET path = $1, method = $2, statusCode = $3, contentType = $4, responseBody = $5
      WHERE id = $6 RETURNING *
    `, [path, method, statusCode, contentType, responseBody, id]);

    if (result.rowCount === 0) return res.status(404).send('Not found');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Update failed', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM fake_api_rules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).send('Not found');
    res.status(204).send();
  } catch {
    res.status(500).send('Delete failed');
  }
});

export default router;
