import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import * as DB from '../db';
import { FakeApiRule, ResponseType, RuleStatus } from '../types/fakeApiRule';
import { fakeARule, removeRoute } from './routeManager';

const router = express.Router();

let db: any;
let app: any;

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jsonwebtoken.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

export function initializeRouter(database: any, application: any) {
  db = database;
  app = application;
  router.use(authenticateToken);

  router.post('/', (req: any, res) => {
    const { path, method, statusCode, contentType, responseBody } = req.body;
    const username = req.user.username;

    if (!path || !method || !statusCode || !contentType || !responseBody) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedStatusCode = parseInt(statusCode);
    if (isNaN(parsedStatusCode) || parsedStatusCode < 100 || parsedStatusCode > 599) {
      return res.status(400).json({ error: 'Invalid status code' });
    }

    try {
      const allRules = DB.getAllRulesByUsername(db, username);
      if (allRules.some(r => r.path === path && r.method === method)) {
        return res.status(409).json({ error: 'Rule already exists' });
      }

      const rule: FakeApiRule = {
        user: username,
        path,
        method,
        statusCode: parsedStatusCode,
        contentType,
        responseBody,
        status: RuleStatus.ACTIVE,
        responseType: ResponseType.STATIC
      };

      DB.addRule(db, rule);
      fakeARule(rule, app);
      res.status(201).json({ message: 'Rule created successfully', rule });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to create rule', details: err.message });
    }
  });

  router.get('/', (req: any, res) => {
    try {
      const rules = DB.getAllRulesByUsername(db, req.user.username);
      res.json({ count: rules.length, rules });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch rules', details: err.message });
    }
  });

  router.get('/:id', (req: any, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      const rule = DB.getRuleById(db, ruleId);
      if (!rule || rule.user !== req.user.username) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch rule', details: err.message });
    }
  });

  router.put('/:id', (req: any, res) => {
    const ruleId = parseInt(req.params.id);
    const { path, method, statusCode, contentType, responseBody } = req.body;
    const username = req.user.username;

    if (!path || !method || !statusCode || !contentType || !responseBody) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedStatusCode = parseInt(statusCode);
    if (isNaN(parsedStatusCode) || parsedStatusCode < 100 || parsedStatusCode > 599) {
      return res.status(400).json({ error: 'Invalid status code' });
    }

    try {
      const existingRule = DB.getRuleById(db, ruleId);
      if (!existingRule || existingRule.user !== username) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      const allRules = DB.getAllRulesByUsername(db, username);
      if (allRules.some(r => r.path === path && r.method === method && r !== existingRule)) {
        return res.status(409).json({ error: 'Duplicate rule' });
      }

      if (existingRule.path !== path || existingRule.method !== method) {
        removeRoute(app, existingRule.path, existingRule.method);
      }

      db.prepare(
        `UPDATE fake_api_rules SET path = ?, method = ?, statusCode = ?, contentType = ?, responseBody = ? WHERE id = ? AND username = ?`
      ).run(path, method, parsedStatusCode, contentType, responseBody, ruleId, username);

      const updatedRule: FakeApiRule = {
        user: username,
        path,
        method,
        statusCode: parsedStatusCode,
        contentType,
        responseBody,
        status: RuleStatus.ACTIVE,
        responseType: ResponseType.STATIC
      };
      fakeARule(updatedRule, app);
      res.json({ message: 'Rule updated successfully', rule: updatedRule });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to update rule', details: err.message });
    }
  });

  router.delete('/:id', (req: any, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      const rule = DB.getRuleById(db, ruleId);
      if (!rule || rule.user !== req.user.username) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      removeRoute(app, rule.path, rule.method);
      DB.removeRule(db, ruleId);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete rule', details: err.message });
    }
  });

  return router;
}

export default router;
