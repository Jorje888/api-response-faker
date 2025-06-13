import Database from "better-sqlite3";
import { FakeApiRule } from "./types/fakeApiRule";
import { FakeApiRulePayload } from "./types/fakeApiRule"; // Assuming FakeApiRulePayload is similar to FakeApiRule but might come from external input

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
        FOREIGN KEY (username) REFERENCES users(username),
        UNIQUE (username, path, method) ON CONFLICT ROLLBACK
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
export function getAllRules(
  db: Database.Database,
  username: string
): FakeApiRule[] {
  try {
    const statement = db.prepare(
      "SELECT path, method, statusCode, contentType, responseBody FROM fake_api_rules WHERE username = ?"
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
 * Inserts a new fake API rule into the database.
 *
 * @param {Database.Database} db - The database connection to use for the operation.
 * @param {FakeApiRule} rule - The rule to be added to the database, containing
 * the path, method, status code, content type, and response body.
 * @param {string} username - The username associated with this rule.
 * @throws Will throw an error if there is a database-related issue during insertion
 * or if rule/username data is invalid.
 */
export function addRule(
  db: Database.Database,
  rule: FakeApiRule,
  username: string
) {
  if (!db) {
    throw new Error("Database is not initialized");
  }
  if (
    !username ||
    username.trim() === "" ||
    !rule.path ||
    !rule.method ||
    !rule.statusCode ||
    !rule.contentType ||
    !rule.responseBody
  ) {
    throw new Error("Rule or username is not valid");
  }
  try {
    db.prepare(
      "INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      username,
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
    throw new Error("An unknown error occurred during rule insertion"); // More specific error
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
