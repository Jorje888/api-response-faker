import express from 'express';
import * as DB from '../db';
import FakeApiRule from '../types/fakeApiRule';
import { fakeARule } from '../util';

const router = express.Router();

// Get database instance (you'll need to pass this from your main server)
let db: any;

// Initialize router with database instance
export function initializeRouter(database: any, app: any) {
  db = database;
  
  // POST - Create new rule
  router.post('/', (req, res) => {
    const { path, method, statusCode, contentType, responseBody } = req.body;
    
    // Validate required fields
    if (!path || !method || !statusCode || !contentType || !responseBody) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['path', 'method', 'statusCode', 'contentType', 'responseBody'] 
      });
    }

    try {
      const rule: FakeApiRule = {
        path,
        method,
        statusCode: parseInt(statusCode),
        contentType,
        responseBody
      };

      // Add to database
      DB.addRule(db, rule);
      
      // Dynamically create the fake endpoint
      fakeARule(rule, app);
      
      // Get the created rule (with ID) by querying back
      const createdRule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE path = ? AND method = ? ORDER BY id DESC LIMIT 1'
      ).get(path, method);
      
      res.status(201).json(createdRule);
    } catch (err: any) {
      res.status(400).json({ 
        error: 'Insert failed', 
        details: err.message 
      });
    }
  });

  // GET - Get all rules
  router.get('/', (req, res) => {
    try {
      const rules = DB.getAllRules(db);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ 
        error: 'Fetch failed', 
        details: err.message 
      });
    }
  });

  // GET - Get rule by ID
  router.get('/:id', (req, res) => {
    try {
      const rule = db.prepare('SELECT * FROM fake_api_rules WHERE id = ?').get(req.params.id);
      
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ 
        error: 'Error fetching rule', 
        details: err.message 
      });
    }
  });

  // PUT - Update rule by ID
  router.put('/:id', (req, res) => {
    const { path, method, statusCode, contentType, responseBody } = req.body;
    const id = req.params.id;

    // Validate required fields
    if (!path || !method || !statusCode || !contentType || !responseBody) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['path', 'method', 'statusCode', 'contentType', 'responseBody'] 
      });
    }

    try {
      // Check if rule exists first
      const existingRule = db.prepare('SELECT * FROM fake_api_rules WHERE id = ?').get(id);
      if (!existingRule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      // Update the rule
      const updateResult = db.prepare(`
        UPDATE fake_api_rules 
        SET path = ?, method = ?, statusCode = ?, contentType = ?, responseBody = ?
        WHERE id = ?
      `).run(path, method, parseInt(statusCode), contentType, responseBody, id);

      if (updateResult.changes === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      // Get the updated rule
      const updatedRule = db.prepare('SELECT * FROM fake_api_rules WHERE id = ?').get(id);
      
      // Re-register the fake endpoint with new data
      const rule: FakeApiRule = {
        path: updatedRule.path,
        method: updatedRule.method,
        statusCode: updatedRule.statusCode,
        contentType: updatedRule.contentType,
        responseBody: updatedRule.responseBody
      };
      fakeARule(rule, app);

      res.json(updatedRule);
    } catch (err: any) {
      res.status(400).json({ 
        error: 'Update failed', 
        details: err.message 
      });
    }
  });

  // DELETE - Delete rule by ID
  router.delete('/:id', (req, res) => {
    try {
      // Check if rule exists first
      const existingRule = db.prepare('SELECT * FROM fake_api_rules WHERE id = ?').get(req.params.id);
      if (!existingRule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      // Delete the rule
      const deleteResult = db.prepare('DELETE FROM fake_api_rules WHERE id = ?').run(req.params.id);
      
      if (deleteResult.changes === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ 
        error: 'Delete failed', 
        details: err.message 
      });
    }
  });

  return router;
}

export default router;

