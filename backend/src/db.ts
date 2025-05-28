import Database from "better-sqlite3";
import FakeApiRule from "./types/fakeApiRule";

/**
 * Initializes an in-memory SQLite database with the necessary schema for
 * persisting api rules.
 *
 * @returns {Database} The initialized database.
 */
export function initializeDB(): Database.Database {
  const db = new Database(":memory:");
  db.exec(
    `CREATE TABLE IF NOT EXISTS fake_api_rules (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              path TEXT NOT NULL,
              method TEXT NOT NULL,
              status_code INTEGER NOT NULL,
              content_type TEXT NOT NULL,
              response_body TEXT NOT NULL,
              UNIQUE(path, method)
          )`
  );
  return db;
}

export function getAllRules(db: Database.Database): FakeApiRule[] {
  return db.prepare("SELECT * FROM api_rules").all() as FakeApiRule[];
}

export function getRuleByPath(db: Database.Database, path: string) {
  return db.prepare("SELECT * FROM api_rules WHERE path = ?").get(path);
}

export function addRule(db: Database.Database, rule: FakeApiRule) {
  try {
    db.prepare(
      "INSERT INTO api_rules (path, method, status_code, content_type, response_body) VALUES (?, ?, ?, ?, ?)"
    ).run(
      rule.path,
      rule.method,
      rule.statusCode,
      rule.contentType,
      rule.responseBody
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}
