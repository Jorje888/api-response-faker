import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import * as DB from '../db';
import { FakeApiRule } from '../types/fakeApiRule';
import { fakeARule, removeRoute } from './routeManager';

const router = express.Router();

//დეკლარაციები
let db: any;
let app: any;

// თოკენის აუთენტიკაციები
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jsonwebtoken.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Initialize router with database instance and app
export function initializeRouter(database: any, application: any) {
  db = database;
  app = application;
  
  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  // POST - Create new rule
  router.post('/', (req: any, res) => {
    const { path, method, statusCode, contentType, responseBody } = req.body;
    const username = req.user.username;
    
    // Validate required fields
    if (!path || !method || !statusCode || !contentType || !responseBody) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['path', 'method', 'statusCode', 'contentType', 'responseBody'] 
      });
    }

    // Validate statusCode is a number
    const parsedStatusCode = parseInt(statusCode);
    if (isNaN(parsedStatusCode) || parsedStatusCode < 100 || parsedStatusCode > 599) {
      return res.status(400).json({ 
        error: 'Invalid status code. Must be a number between 100-599' 
      });
    }

    try {
      const rule: FakeApiRule = {
        user: username,
        path,
        method,
        statusCode: parsedStatusCode,
        contentType,
        responseBody
      };

      // Check if rule already exists for this user/path/method combination
      const existingRule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE username = ? AND path = ? AND method = ?'
      ).get(username, path, method);
      
      if (existingRule) {
        return res.status(409).json({ 
          error: 'A rule with this path and method already exists for your account' 
        });
      }

      // Add to database
      DB.addRule(db, rule);
      
      // Dynamically create the fake endpoint
      fakeARule(rule, app);
      
      // Get the created rule (with ID) by querying back
      const createdRule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE username = ? AND path = ? AND method = ? ORDER BY id DESC LIMIT 1'
      ).get(username, path, method);
      
      res.status(201).json({
        message: 'Rule created successfully',
        rule: createdRule
      });
    } catch (err: any) {
      console.error('Error creating rule:', err);
      res.status(400).json({ 
        error: 'Failed to create rule', 
        details: err.message 
      });
    }
  });

  // GET - Get all rules for the authenticated user
  router.get('/', (req: any, res) => {
    try {
      const username = req.user.username;
      const rules = DB.getAllRulesByUsername(db, username);
      res.json({
        count: rules.length,
        rules: rules
      });
    } catch (err: any) {
      console.error('Error fetching rules:', err);
      res.status(500).json({ 
        error: 'Failed to fetch rules', 
        details: err.message 
      });
    }
  });

  // GET - Get rule by ID (only if it belongs to the authenticated user)
  router.get('/:id', (req: any, res) => {
    try {
      const username = req.user.username;
      const ruleId = parseInt(req.params.id);
      
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }

      const rule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE id = ? AND username = ?'
      ).get(ruleId, username);
      
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      
      res.json(rule);
    } catch (err: any) {
      console.error('Error fetching rule:', err);
      res.status(500).json({ 
        error: 'Failed to fetch rule', 
        details: err.message 
      });
    }
  });

  // PUT - Update rule by ID (only if it belongs to the authenticated user)
  router.put('/:id', (req: any, res) => {
    const { path, method, statusCode, contentType, responseBody } = req.body;
    const username = req.user.username;
    const ruleId = parseInt(req.params.id);

    if (isNaN(ruleId)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    // Validate required fields
    if (!path || !method || !statusCode || !contentType || !responseBody) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['path', 'method', 'statusCode', 'contentType', 'responseBody'] 
      });
    }

    // Validate statusCode
    const parsedStatusCode = parseInt(statusCode);
    if (isNaN(parsedStatusCode) || parsedStatusCode < 100 || parsedStatusCode > 599) {
      return res.status(400).json({ 
        error: 'Invalid status code. Must be a number between 100-599' 
      });
    }

    try {
      // Check if rule exists and belongs to the user
      const existingRule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE id = ? AND username = ?'
      ).get(ruleId, username);
      
      if (!existingRule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      // Check if another rule with the same path/method exists (excluding current rule)
      const conflictingRule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE username = ? AND path = ? AND method = ? AND id != ?'
      ).get(username, path, method, ruleId);
      
      if (conflictingRule) {
        return res.status(409).json({ 
          error: 'Another rule with this path and method already exists for your account' 
        });
      }

      // Remove the old route if path or method changed
      if (existingRule.path !== path || existingRule.method !== method) {
        removeRoute(app, existingRule.path, existingRule.method);
      }

      // Update the rule in database
      const updateResult = db.prepare(`
        UPDATE fake_api_rules 
        SET path = ?, method = ?, statusCode = ?, contentType = ?, responseBody = ?
        WHERE id = ? AND username = ?
      `).run(path, method, parsedStatusCode, contentType, responseBody, ruleId, username);

      if (updateResult.changes === 0) {
        return res.status(404).json({ error: 'Rule not found or update failed' });
      }

      // Get the updated rule
      const updatedRule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE id = ?'
      ).get(ruleId);
      
      // Re-register the fake endpoint with new data
      const rule: FakeApiRule = {
        user: updatedRule.username,
        path: updatedRule.path,
        method: updatedRule.method,
        statusCode: updatedRule.statusCode,
        contentType: updatedRule.contentType,
        responseBody: updatedRule.responseBody
      };
      fakeARule(rule, app);

      res.json({
        message: 'Rule updated successfully',
        rule: updatedRule
      });
    } catch (err: any) {
      console.error('Error updating rule:', err);
      res.status(400).json({ 
        error: 'Failed to update rule', 
        details: err.message 
      });
    }
  });

  // DELETE - Delete rule by ID (only if it belongs to the authenticated user)
  router.delete('/:id', (req: any, res) => {
    try {
      const username = req.user.username;
      const ruleId = parseInt(req.params.id);
      
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }

      // Check if rule exists and belongs to the user
      const existingRule = db.prepare(
        'SELECT * FROM fake_api_rules WHERE id = ? AND username = ?'
      ).get(ruleId, username);
      
      if (!existingRule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      // Remove the dynamic route
      removeRoute(app, existingRule.path, existingRule.method);

      // Delete the rule from database
      const deleteResult = db.prepare(
        'DELETE FROM fake_api_rules WHERE id = ? AND username = ?'
      ).run(ruleId, username);
      
      if (deleteResult.changes === 0) {
        return res.status(404).json({ error: 'Rule not found or deletion failed' });
      }

      res.status(204).send();
    } catch (err: any) {
      console.error('Error deleting rule:', err);
      res.status(500).json({ 
        error: 'Failed to delete rule', 
        details: err.message 
      });
    }
  });

  return router;
}

export default router;