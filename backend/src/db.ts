import Database from "better-sqlite3";
import { FakeApiRule } from "./types/fakeApiRule";
import {
  FakeApiRulePayload,
  HttpMethod,
  ContentType,
  RuleStatus,
  ResponseType,
  RequestLog,
  RuleAnalytics,
  AnalyticsSummary,
  AnalyticsFilter,
  RuleGroup,
  RuleHistoryEntry,
  RuleSearchParams,
  RuleSearchResult,
  RuleBulkOperation,
} from "./types/fakeApiRule";

/**
 * Converts a FakeApiRulePayload object to a FakeApiRule object.
 *
 * @param {FakeApiRulePayload} payload - The payload containing the rule data.
 * @returns {FakeApiRule} The converted FakeApiRule object with the same
 * properties as the input payload.
 */
function processPayload(payload: FakeApiRulePayload[]): FakeApiRule[] {
  return payload.map((item) => ({
    user: item.username,
    path: item.path,
    method: item.method,
    statusCode: item.statusCode,
    contentType: item.contentType,
    responseBody: item.responseBody,
    name: item.name,
    description: item.description,
    status: item.status,
    responseType: item.responseType,
    delay: item.delay,
    headers: item.headers,
    conditions: item.conditions,
    responses: item.responses,
    template: item.template,
    tags: item.tags,
    groupId: item.groupId,
  }));
}

/**
 * Initializes an in-memory SQLite database with the necessary schema for
 * persisting api rules.
 *
 * @returns {Database} The initialized database.
 */
export function initializeDB(): Database.Database {
  const db = new Database(":memory:");
  db.exec(
    `
      CREATE TABLE IF NOT EXISTS users (
        username TEXT NOT NULL PRIMARY KEY,
        hashPass TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS fake_api_rules (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        path TEXT NOT NULL,
        method TEXT NOT NULL,
        statusCode INTEGER NOT NULL,
        contentType TEXT NOT NULL,
        responseBody TEXT NOT NULL,
        name TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        responseType TEXT NOT NULL DEFAULT 'STATIC',
        delay INTEGER,
        headers TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastUsed TEXT,
        usageCount INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        groupId INTEGER,
        version INTEGER NOT NULL DEFAULT 1,
        conditions TEXT,
        responses TEXT,
        template TEXT,
        FOREIGN KEY (username) REFERENCES users(username),
        UNIQUE (username, path, method) ON CONFLICT ROLLBACK
      );
      CREATE TABLE IF NOT EXISTS request_logs (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        ruleId INTEGER NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        query TEXT,
        headers TEXT NOT NULL,
        body TEXT,
        responseStatus INTEGER NOT NULL,
        responseTime INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        userAgent TEXT,
        ip TEXT,
        userId TEXT,
        error TEXT,
        FOREIGN KEY (ruleId) REFERENCES fake_api_rules(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_request_logs_rule_id ON request_logs(ruleId);
      CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(userId);
      
      -- Enhanced rule management tables
      CREATE TABLE IF NOT EXISTS rule_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        color TEXT,
        is_default BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (username) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS rule_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER NOT NULL,
        version INTEGER NOT NULL,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        changed_by TEXT NOT NULL,
        changes TEXT NOT NULL,
        comment TEXT,
        action TEXT NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES fake_api_rules (id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users (username)
      );
    `
  );
  return db;
}

/**
 * Retrieves fake API rules for a specific username from the database.
 *
 * @param {Database} db - The database to query.
 * @param {string} username - The username for whom to retrieve rules.
 * @returns {FakeApiRule[]} An array of fake API rules for the specified user.
 */
export function getAllRulesByUsername(
  db: Database.Database,
  username: string
): FakeApiRule[] {
  try {
    const statement = db.prepare(
      `SELECT id, username, path, method, statusCode, contentType, responseBody, name, description, status, responseType, delay, headers, createdAt, updatedAt, lastUsed, usageCount, tags, groupId, version, conditions, responses, template FROM fake_api_rules WHERE username = ?`
    );
    return processPayload(statement.all(username) as FakeApiRulePayload[]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while accessing the database");
  }
}

/**
 * Retrieves all fake API rules from the database.
 *
 * @param {Database} db - The database to query.
 * @returns {FakeApiRule[]} An array of fake API rules.
 */
export function getAllRules(db: Database.Database): FakeApiRule[] {
  try {
    const statement = db.prepare(
      `SELECT id, username, path, method, statusCode, contentType, responseBody, name, description, status, responseType, delay, headers, createdAt, updatedAt, lastUsed, usageCount, tags, groupId, version, conditions, responses, template FROM fake_api_rules`
    );
    return processPayload(statement.all() as FakeApiRulePayload[]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while accessing the database");
  }
}

/**
 * Retrieves all fake API rules from the database with their IDs.
 *
 * @param {Database} db - The database to query.
 * @returns {FakeApiRulePayload[]} An array of fake API rules with IDs.
 */
export function getAllRulesWithIds(db: Database.Database): FakeApiRulePayload[] {
  try {
    const statement = db.prepare(
      `SELECT id, username, path, method, statusCode, contentType, responseBody, name, description, status, responseType, delay, headers, createdAt, updatedAt, lastUsed, usageCount, tags, groupId, version, conditions, responses, template FROM fake_api_rules`
    );
    return statement.all() as FakeApiRulePayload[];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while accessing the database");
  }
}

/**
 * Inserts a new fake API rule into the database.
 *
 * @param {Database.Database} db - The database connection to use for the operation.
 * @param {FakeApiRule} rule - The rule to be added to the database, containing
 * the path, method, status code, content type, and response body.
 * @throws Will throw an error if there is a database-related issue during insertion
 * or if rule/username data is invalid.
 */
export function addRule(db: Database.Database, rule: FakeApiRule) {
  if (!db) {
    throw new Error("Database is not initialized");
  }
  if (
    !rule.user ||
    rule.user.trim() === "" ||
    !rule.path ||
    !rule.method ||
    !rule.statusCode ||
    !rule.contentType ||
    !rule.responseBody
  ) {
    throw new Error("Rule or username is not valid");
  }
  try {
    const result = db.prepare(
      `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody, name, description, status, responseType, delay, headers, createdAt, updatedAt, usageCount, tags, groupId, version, conditions, responses, template)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      rule.user,
      rule.path,
      rule.method,
      rule.statusCode,
      rule.contentType,
      rule.responseBody,
      rule.name || null,
      rule.description || null,
      rule.status || RuleStatus.ACTIVE,
      rule.responseType || ResponseType.STATIC,
      rule.delay || null,
      rule.headers ? JSON.stringify(rule.headers) : null,
      new Date().toISOString(),
      new Date().toISOString(),
      0,
      rule.tags ? JSON.stringify(rule.tags) : null,
      rule.groupId || null,
      1,
      rule.conditions ? JSON.stringify(rule.conditions) : null,
      rule.responses ? JSON.stringify(rule.responses) : null,
      rule.template ? JSON.stringify(rule.template) : null
    );
    
    // Create history entry for the new rule
    const ruleId = result.lastInsertRowid as number;
    addRuleHistoryEntry(db, {
      ruleId,
      version: 1,
      changedBy: rule.user,
      changes: rule,
      action: 'created',
      comment: 'Rule created'
    });
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred during rule insertion");
  }
}

export function addUser(
  db: Database.Database,
  username: string,
  hashPass: string
) {
  //TODO write  robust error handling, add tests
  db.prepare(`INSERT INTO users (username, hashPass) VALUES (?, ?)`).run(
    username,
    hashPass
  );
}

export function hasUser(db: Database.Database, username: string): boolean {
  //TODO write  robust error handling, add tests
  const user = db
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username);
  return !!user;
}

export function removeUser(db: Database.Database, username: string) {
  //TODO write  robust error handling, add tests
  db.prepare(`DELETE FROM users WHERE username = ?`).run(username);
}

export function getHashPass(db: Database.Database, username: string): string {
  //TODO write  robust error handling, add tests
  const user = db
    .prepare(`SELECT hashPass FROM users WHERE username = ?`)
    .get(username) as { hashPass?: string } | undefined;
  if (!user?.hashPass) {
    throw new Error(`User not found: ${username}`);
  }
  return user.hashPass;
}

export function seedDatabase(db: Database.Database) {
  const rules: FakeApiRule[] = [
    {
      user: "test",
      path: "/test/admin",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "Hello, Administrator!",
      status: RuleStatus.ACTIVE,
      responseType: ResponseType.STATIC,
    },
    {
      user: "test",
      path: "/test/user",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.TEXT,
      responseBody: "Hello, User!",
      status: RuleStatus.ACTIVE,
      responseType: ResponseType.STATIC,
    },
    {
      user: "test",
      path: "/test/admin2",
      method: HttpMethod.POST,
      statusCode: 201,
      contentType: ContentType.JSON,
      responseBody: "Created, Administrator!",
      status: RuleStatus.ACTIVE,
      responseType: ResponseType.STATIC,
    },
  ];
  addUser(db, "test", "test1234");
  for (const rule of rules) {
    addRule(db, rule);
  }
  
  // Create default rule groups
  createRuleGroup(db, {
    name: "Default",
    description: "Default group for all rules",
    userId: "test",
    color: "#007bff",
    isDefault: true
  });
  
  createRuleGroup(db, {
    name: "API Endpoints",
    description: "Group for API endpoint rules",
    userId: "test",
    color: "#28a745",
    isDefault: false
  });
  
  createRuleGroup(db, {
    name: "Test Rules",
    description: "Group for testing purposes",
    userId: "test",
    color: "#ffc107",
    isDefault: false
  });
}

export function getRuleById(
  db: Database.Database,
  id: number
): FakeApiRule | null {
  try {
    const statement = db.prepare(
      "SELECT username, path, method, statusCode, contentType, responseBody FROM fake_api_rules WHERE id = ?"
    );
    const result = statement.get(id) as FakeApiRulePayload | undefined;
    return result ? processPayload([result])[0] : null;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while accessing the database");
  }
}

export function getRuleByIdWithVersion(
  db: Database.Database,
  id: number
): FakeApiRulePayload | null {
  try {
    const statement = db.prepare(
      `SELECT id, username, path, method, statusCode, contentType, responseBody, name, description, status, responseType, delay, headers, createdAt, updatedAt, lastUsed, usageCount, tags, groupId, version, conditions, responses, template FROM fake_api_rules WHERE id = ?`
    );
    const result = statement.get(id) as FakeApiRulePayload | undefined;
    return result || null;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while accessing the database");
  }
}

export function removeRule(db: Database.Database, id: number) {
  try {
    const statement = db.prepare("DELETE FROM fake_api_rules WHERE id = ?");
    const result = statement.run(id);
    if (result.changes === 0) {
      throw new Error(`No rule found with id ${id}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while accessing the database");
  }
}

/**
 * Logs a request to the database
 */
export function logRequest(db: Database.Database, log: Omit<RequestLog, 'id'>) {
  try {
    db.prepare(
      `INSERT INTO request_logs (ruleId, method, path, query, headers, body, responseStatus, responseTime, timestamp, userAgent, ip, userId, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      log.ruleId,
      log.method,
      log.path,
      log.query ? JSON.stringify(log.query) : null,
      JSON.stringify(log.headers),
      log.body || null,
      log.responseStatus,
      log.responseTime,
      log.timestamp,
      log.userAgent || null,
      log.ip || null,
      log.userId || null,
      log.error || null
    );
  } catch (error) {
    console.error('Error logging request:', error);
  }
}

/**
 * Updates usage statistics for a rule
 */
export function updateRuleUsage(db: Database.Database, ruleId: number) {
  try {
    db.prepare(
      `UPDATE fake_api_rules 
       SET usageCount = usageCount + 1, lastUsed = ? 
       WHERE id = ?`
    ).run(new Date().toISOString(), ruleId);
  } catch (error) {
    console.error('Error updating rule usage:', error);
  }
}

/**
 * Gets analytics for a specific rule
 */
export function getRuleAnalytics(db: Database.Database, ruleId: number, days: number = 30): RuleAnalytics {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get basic statistics
    const stats = db.prepare(
      `SELECT 
        COUNT(*) as totalRequests,
        COUNT(DISTINCT ip) as uniqueIps,
        AVG(responseTime) as averageResponseTime,
        COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as errorCount,
        MAX(timestamp) as lastAccessed
       FROM request_logs 
       WHERE ruleId = ? AND timestamp >= ?`
    ).get(ruleId, startDate.toISOString()) as any;

    // Get status code distribution
    const statusCodes = db.prepare(
      `SELECT responseStatus, COUNT(*) as count
       FROM request_logs 
       WHERE ruleId = ? AND timestamp >= ?
       GROUP BY responseStatus`
    ).all(ruleId, startDate.toISOString()) as Array<{responseStatus: number, count: number}>;

    const statusCodeDistribution: Record<number, number> = {};
    statusCodes.forEach(row => {
      statusCodeDistribution[row.responseStatus] = row.count;
    });

    // Get requests per day
    const dailyRequests = db.prepare(
      `SELECT DATE(timestamp) as date, COUNT(*) as count
       FROM request_logs 
       WHERE ruleId = ? AND timestamp >= ?
       GROUP BY DATE(timestamp)
       ORDER BY date`
    ).all(ruleId, startDate.toISOString()) as Array<{date: string, count: number}>;

    // Get peak hour
    const peakHour = db.prepare(
      `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
       FROM request_logs 
       WHERE ruleId = ? AND timestamp >= ?
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`
    ).get(ruleId, startDate.toISOString()) as any;

    // Get average requests per hour
    const avgPerHour = db.prepare(
      `SELECT AVG(hourly_count) as averageRequestsPerHour
       FROM (
         SELECT COUNT(*) as hourly_count
         FROM request_logs 
         WHERE ruleId = ? AND timestamp >= ?
         GROUP BY strftime('%Y-%m-%d %H', timestamp)
       )`
    ).get(ruleId, startDate.toISOString()) as any;

    return {
      ruleId,
      totalRequests: stats.totalRequests || 0,
      uniqueIps: stats.uniqueIps || 0,
      averageResponseTime: stats.averageResponseTime || 0,
      statusCodeDistribution,
      requestsPerDay: dailyRequests,
      lastAccessed: stats.lastAccessed || '',
      errorRate: stats.totalRequests > 0 ? (stats.errorCount / stats.totalRequests) * 100 : 0,
      peakHour: peakHour?.hour || 0,
      averageRequestsPerHour: avgPerHour?.averageRequestsPerHour || 0
    };
  } catch (error) {
    console.error('Error getting rule analytics:', error);
    return {
      ruleId,
      totalRequests: 0,
      uniqueIps: 0,
      averageResponseTime: 0,
      statusCodeDistribution: {},
      requestsPerDay: [],
      lastAccessed: '',
      errorRate: 0,
      peakHour: 0,
      averageRequestsPerHour: 0
    };
  }
}

/**
 * Gets overall analytics summary
 */
export function getAnalyticsSummary(db: Database.Database, days: number = 30): AnalyticsSummary {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get basic statistics
    const stats = db.prepare(
      `SELECT 
        COUNT(*) as totalRequests,
        COUNT(DISTINCT userId) as uniqueUsers,
        COUNT(DISTINCT ruleId) as uniqueRules,
        AVG(responseTime) as averageResponseTime,
        COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as totalErrors
       FROM request_logs 
       WHERE timestamp >= ?`
    ).get(startDate.toISOString()) as any;

    // Get most active rule
    const mostActiveRule = db.prepare(
      `SELECT ruleId, COUNT(*) as requestCount
       FROM request_logs 
       WHERE timestamp >= ?
       GROUP BY ruleId
       ORDER BY requestCount DESC
       LIMIT 1`
    ).get(startDate.toISOString()) as any;

    // Get rule path for most active rule
    let rulePath = '';
    if (mostActiveRule) {
      const rule = db.prepare(
        `SELECT path FROM fake_api_rules WHERE id = ?`
      ).get(mostActiveRule.ruleId) as any;
      rulePath = rule?.path || '';
    }

    // Get busiest hour
    const busiestHour = db.prepare(
      `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
       FROM request_logs 
       WHERE timestamp >= ?
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`
    ).get(startDate.toISOString()) as any;

    // Get requests per hour
    const requestsPerHour = db.prepare(
      `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
       FROM request_logs 
       WHERE timestamp >= ?
       GROUP BY hour
       ORDER BY hour`
    ).all(startDate.toISOString()) as Array<{hour: number, count: number}>;

    return {
      totalRequests: stats.totalRequests || 0,
      uniqueUsers: stats.uniqueUsers || 0,
      uniqueRules: stats.uniqueRules || 0,
      averageResponseTime: stats.averageResponseTime || 0,
      totalErrors: stats.totalErrors || 0,
      errorRate: stats.totalRequests > 0 ? (stats.totalErrors / stats.totalRequests) * 100 : 0,
      mostActiveRule: {
        ruleId: mostActiveRule?.ruleId || 0,
        path: rulePath,
        requestCount: mostActiveRule?.requestCount || 0
      },
      busiestHour: busiestHour?.hour || 0,
      requestsPerHour
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return {
      totalRequests: 0,
      uniqueUsers: 0,
      uniqueRules: 0,
      averageResponseTime: 0,
      totalErrors: 0,
      errorRate: 0,
      mostActiveRule: { ruleId: 0, path: '', requestCount: 0 },
      busiestHour: 0,
      requestsPerHour: []
    };
  }
}

/**
 * Gets filtered request logs
 */
export function getRequestLogs(db: Database.Database, filter: AnalyticsFilter, limit: number = 100): RequestLog[] {
  try {
    let query = `SELECT * FROM request_logs WHERE 1=1`;
    const params: any[] = [];

    if (filter.ruleId) {
      query += ` AND ruleId = ?`;
      params.push(filter.ruleId);
    }

    if (filter.userId) {
      query += ` AND userId = ?`;
      params.push(filter.userId);
    }

    if (filter.startDate) {
      query += ` AND timestamp >= ?`;
      params.push(filter.startDate);
    }

    if (filter.endDate) {
      query += ` AND timestamp <= ?`;
      params.push(filter.endDate);
    }

    if (filter.method) {
      query += ` AND method = ?`;
      params.push(filter.method);
    }

    if (filter.statusCode) {
      query += ` AND responseStatus = ?`;
      params.push(filter.statusCode);
    }

    if (filter.minResponseTime) {
      query += ` AND responseTime >= ?`;
      params.push(filter.minResponseTime);
    }

    if (filter.maxResponseTime) {
      query += ` AND responseTime <= ?`;
      params.push(filter.maxResponseTime);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    const logs = db.prepare(query).all(...params) as any[];
    
    return logs.map(log => ({
      id: log.id,
      ruleId: log.ruleId,
      method: log.method as HttpMethod,
      path: log.path,
      query: log.query ? JSON.parse(log.query) : undefined,
      headers: JSON.parse(log.headers),
      body: log.body,
      responseStatus: log.responseStatus,
      responseTime: log.responseTime,
      timestamp: log.timestamp,
      userAgent: log.userAgent,
      ip: log.ip,
      userId: log.userId,
      error: log.error
    }));
  } catch (error) {
    console.error('Error getting request logs:', error);
    return [];
  }
}

// Enhanced rule management tables
export function createRuleGroup(db: Database.Database, group: Omit<RuleGroup, 'id' | 'createdAt' | 'updatedAt'>): RuleGroup {
  const stmt = db.prepare(`
    INSERT INTO rule_groups (name, description, user_id, color, is_default)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(group.name, group.description, group.userId, group.color, group.isDefault ? 1 : 0);
  
  return {
    id: result.lastInsertRowid as number,
    name: group.name,
    description: group.description,
    userId: group.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    color: group.color,
    isDefault: group.isDefault
  };
}

export function getRuleGroups(db: Database.Database, userId: string): RuleGroup[] {
  const stmt = db.prepare(`
    SELECT id, name, description, user_id as userId, created_at as createdAt, 
           updated_at as updatedAt, color, is_default as isDefault
    FROM rule_groups 
    WHERE user_id = ?
    ORDER BY is_default DESC, name ASC
  `);
  
  return stmt.all(userId) as RuleGroup[];
}

export function updateRuleGroup(db: Database.Database, id: number, updates: Partial<RuleGroup>): boolean {
  const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt');
  if (fields.length === 0) return false;
  
  const setClause = fields.map(field => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`).join(', ');
  const values = fields.map(field => {
    const value = updates[field as keyof RuleGroup];
    return field === 'isDefault' ? (value ? 1 : 0) : value;
  });
  
  const stmt = db.prepare(`
    UPDATE rule_groups 
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  const result = stmt.run(...values, id);
  return result.changes > 0;
}

export function deleteRuleGroup(db: Database.Database, id: number, userId: string): boolean {
  const stmt = db.prepare(`
    DELETE FROM rule_groups 
    WHERE id = ? AND user_id = ? AND is_default = 0
  `);
  
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

export function addRuleHistoryEntry(db: Database.Database, entry: Omit<RuleHistoryEntry, 'id' | 'changedAt'>): RuleHistoryEntry {
  const stmt = db.prepare(`
    INSERT INTO rule_history (rule_id, version, changed_by, changes, comment, action)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    entry.ruleId,
    entry.version,
    entry.changedBy,
    JSON.stringify(entry.changes),
    entry.comment,
    entry.action
  );
  
  return {
    id: result.lastInsertRowid as number,
    ruleId: entry.ruleId,
    version: entry.version,
    changedAt: new Date().toISOString(),
    changedBy: entry.changedBy,
    changes: entry.changes,
    comment: entry.comment,
    action: entry.action
  };
}

export function getRuleHistory(db: Database.Database, ruleId: number): RuleHistoryEntry[] {
  const stmt = db.prepare(`
    SELECT id, rule_id as ruleId, version, changed_at as changedAt, 
           changed_by as changedBy, changes, comment, action
    FROM rule_history 
    WHERE rule_id = ?
    ORDER BY version DESC
  `);
  
  const entries = stmt.all(ruleId) as any[];
  return entries.map(entry => ({
    id: entry.id,
    ruleId: entry.ruleId,
    version: entry.version,
    changedAt: entry.changedAt,
    changedBy: entry.changedBy,
    changes: JSON.parse(entry.changes),
    comment: entry.comment,
    action: entry.action
  }));
}

export function searchRules(db: Database.Database, params: RuleSearchParams): RuleSearchResult {
  let query = `
    SELECT r.*, u.username as createdBy
    FROM fake_api_rules r
    LEFT JOIN users u ON r.username = u.username
    WHERE 1=1
  `;
  
  const conditions: string[] = [];
  const values: any[] = [];
  
  if (params.search) {
    conditions.push(`(r.name LIKE ? OR r.path LIKE ? OR r.description LIKE ?)`);
    const searchTerm = `%${params.search}%`;
    values.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (params.status && params.status.length > 0) {
    conditions.push(`r.status IN (${params.status.map(() => '?').join(',')})`);
    values.push(...params.status);
  }
  
  if (params.methods && params.methods.length > 0) {
    conditions.push(`r.method IN (${params.methods.map(() => '?').join(',')})`);
    values.push(...params.methods);
  }
  
  if (params.contentTypes && params.contentTypes.length > 0) {
    conditions.push(`r.content_type IN (${params.contentTypes.map(() => '?').join(',')})`);
    values.push(...params.contentTypes);
  }
  
  if (params.tags && params.tags.length > 0) {
    conditions.push(`r.tags LIKE ?`);
    values.push(`%${params.tags.join('%')}%`);
  }
  
  if (params.groupId) {
    conditions.push(`r.group_id = ?`);
    values.push(params.groupId);
  }
  
  if (params.userId) {
    conditions.push(`r.username = ?`);
    values.push(params.userId);
  }
  
  if (params.createdAfter) {
    conditions.push(`r.created_at >= ?`);
    values.push(params.createdAfter);
  }
  
  if (params.createdBefore) {
    conditions.push(`r.created_at <= ?`);
    values.push(params.createdBefore);
  }
  
  if (params.lastUsedAfter) {
    conditions.push(`r.last_used >= ?`);
    values.push(params.lastUsedAfter);
  }
  
  if (conditions.length > 0) {
    query += ` AND ${conditions.join(' AND ')}`;
  }
  
  // Count total results
  const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
  const countStmt = db.prepare(countQuery);
  const total = (countStmt.get(...values) as any).total;
  
  // Add sorting
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder || 'desc';
  const sortField = sortBy === 'createdAt' ? 'r.created_at' : 
                   sortBy === 'lastUsed' ? 'r.last_used' : 
                   sortBy === 'usageCount' ? 'r.usage_count' : 
                   sortBy === 'status' ? 'r.status' : 'r.name';
  
  query += ` ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
  
  // Add pagination
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;
  
  query += ` LIMIT ? OFFSET ?`;
  values.push(limit, offset);
  
  const stmt = db.prepare(query);
  const rules = stmt.all(...values) as FakeApiRulePayload[];
  
  return {
    rules,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export function bulkUpdateRules(db: Database.Database, operation: RuleBulkOperation): boolean {
  const { ruleIds, operation: op, groupId, userId } = operation;
  
  if (ruleIds.length === 0) return false;
  
  let query: string;
  let values: any[];
  
  switch (op) {
    case 'activate':
      query = `UPDATE fake_api_rules SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id IN (${ruleIds.map(() => '?').join(',')}) AND username = ?`;
      values = [...ruleIds, userId];
      break;
    case 'deactivate':
      query = `UPDATE fake_api_rules SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id IN (${ruleIds.map(() => '?').join(',')}) AND username = ?`;
      values = [...ruleIds, userId];
      break;
    case 'archive':
      query = `UPDATE fake_api_rules SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id IN (${ruleIds.map(() => '?').join(',')}) AND username = ?`;
      values = [...ruleIds, userId];
      break;
    case 'delete':
      query = `DELETE FROM fake_api_rules WHERE id IN (${ruleIds.map(() => '?').join(',')}) AND username = ?`;
      values = [...ruleIds, userId];
      break;
    case 'move_to_group':
      if (!groupId) return false;
      query = `UPDATE fake_api_rules SET group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${ruleIds.map(() => '?').join(',')}) AND username = ?`;
      values = [groupId, ...ruleIds, userId];
      break;
    default:
      return false;
  }
  
  const stmt = db.prepare(query);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function updateRule(db: Database.Database, id: number, updates: Partial<FakeApiRule>, userId: string, comment?: string): boolean {
  try {
    // Get current rule to compare changes
    const currentRule = getRuleByIdWithVersion(db, id);
    if (!currentRule) {
      return false;
    }
    
    // Prepare update fields
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.responseType !== undefined) {
      fields.push('responseType = ?');
      values.push(updates.responseType);
    }
    if (updates.delay !== undefined) {
      fields.push('delay = ?');
      values.push(updates.delay);
    }
    if (updates.headers !== undefined) {
      fields.push('headers = ?');
      values.push(updates.headers ? JSON.stringify(updates.headers) : null);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updates.tags ? JSON.stringify(updates.tags) : null);
    }
    if (updates.groupId !== undefined) {
      fields.push('groupId = ?');
      values.push(updates.groupId);
    }
    if (updates.conditions !== undefined) {
      fields.push('conditions = ?');
      values.push(updates.conditions ? JSON.stringify(updates.conditions) : null);
    }
    if (updates.responses !== undefined) {
      fields.push('responses = ?');
      values.push(updates.responses ? JSON.stringify(updates.responses) : null);
    }
    if (updates.template !== undefined) {
      fields.push('template = ?');
      values.push(updates.template ? JSON.stringify(updates.template) : null);
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    // Add updated_at and increment version
    fields.push('updatedAt = ?', 'version = version + 1');
    values.push(new Date().toISOString());
    
    const query = `UPDATE fake_api_rules SET ${fields.join(', ')} WHERE id = ? AND username = ?`;
    values.push(id, userId);
    
    const result = db.prepare(query).run(...values);
    
    if (result.changes > 0) {
      // Get the new version number
      const updatedRule = getRuleByIdWithVersion(db, id);
      if (updatedRule) {
        // Create history entry
        addRuleHistoryEntry(db, {
          ruleId: id,
          version: updatedRule.version,
          changedBy: userId,
          changes: updates,
          action: 'updated',
          comment: comment || 'Rule updated'
        });
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating rule:', error);
    return false;
  }
}