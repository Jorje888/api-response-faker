import Database from "better-sqlite3";
import FakeApiRule from "./types/fakeApiRule";
import { FakeApiRulePayload } from "./types/fakeApiRule";

/**
 * Converts a FakeApiRulePayload object to a FakeApiRule object.
 *
 * @param {FakeApiRulePayload} payload - The payload containing the rule data.
 * @returns {FakeApiRule} The converted FakeApiRule object with the same
 * properties as the input payload.
 */
function processPayload(payload: FakeApiRulePayload[]): FakeApiRule[] {
  return payload.map((item) => ({
    path: item.path,
    method: item.method,
    statusCode: item.statusCode,
    contentType: item.contentType,
    responseBody: item.responseBody,
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
    `CREATE TABLE IF NOT EXISTS fake_api_rules (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              path TEXT NOT NULL,
              method TEXT NOT NULL,
              statusCode INTEGER NOT NULL,
              contentType TEXT NOT NULL,
              responseBody TEXT NOT NULL,
              UNIQUE(path, method)
          );`
  );
  return db;
}

/**
 * Retrieves all fake API rules from the database.
 *
 * @param {Database} db - The database to query.
 * @returns {FakeApiRule[]} An array of all fake API rules.
 */
export function getAllRules(db: Database.Database): FakeApiRule[] {
  try {
    return processPayload(
      db.prepare("SELECT * FROM fake_api_rules").all() as FakeApiRulePayload[]
    );
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
 * @throws Will throw an error if there is a database-related issue during insertion.
 */
export function addRule(db: Database.Database, rule: FakeApiRule) {
  if (!db) {
    throw new Error("Database is not initialized");
  }
  if (
    !rule.path ||
    !rule.method ||
    !rule.statusCode ||
    !rule.contentType ||
    !rule.responseBody
  ) {
    throw new Error("Rule is not valid");
  }
  try {
    db.prepare(
      "INSERT INTO fake_api_rules (path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?)"
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
export function getRuleById(db : Database.Database, id: number): FakeApiRule | null {
  try {
    const row = db.prepare("SELECT * FROM fake_api_rules WHERE id = ?").get(id) as FakeApiRulePayload | undefined;
    return row ? processPayload([row])[0] : null;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while accessing the database");
  }
}
export function updatedRule(  db: Database.Database,  id: number,  updates: Partial<FakeApiRule>): FakeApiRule | null {
  if (!db) {
    throw new Error("Database is not initialized");
  }
  if (Object.keys(updates).length === 0) {
    throw new Error("No updates provided");
  }
  
  const existingRule = getRuleById(db, id);
  if (!existingRule) {
    throw new Error(`Rule with ID ${id} does not exist`); // Maybe this should be changed so it will add new rle in this case
  }

  const updatedFields: Partial<FakeApiRule> = { ...existingRule, ...updates };
  
  try {
    db.prepare( 
      `UPDATE fake_api_rules SET 
        path = ?, 
        method = ?, 
        statusCode = ?, 
        contentType = ?, 
        responseBody = ? 
      WHERE id = ?`
    ).run(
      updatedFields.path,
      updatedFields.method,
      updatedFields.statusCode,
      updatedFields.contentType,
      updatedFields.responseBody,
      id
    );
    
    return getRuleById(db, id);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while updating the database");
  }
}

export function deleteRule(db: Database.Database, id: number): boolean {
  if (!db) {
    throw new Error("Database is not initialized");
  }
  
  const existingRule = getRuleById(db, id);
  if (!existingRule) {
    throw new Error(`Rule with ID ${id} does not exist`);
  }

  try {
    const result = db.prepare("DELETE FROM fake_api_rules WHERE id = ?").run(id);
    return result.changes > 0;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while deleting the rule");
  }
}