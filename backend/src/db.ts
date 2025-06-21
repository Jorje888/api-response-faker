import Database from "better-sqlite3";
import { FakeApiRule } from "./types/fakeApiRule";
import {
  FakeApiRulePayload,
  HttpMethod,
  ContentType,
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
export function getAllRulesByUsername(
  db: Database.Database,
  username: string
): FakeApiRule[] {
  try {
    const statement = db.prepare(
      "SELECT username, path, method, statusCode, contentType, responseBody FROM fake_api_rules WHERE username = ?"
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
      "SELECT username, path, method, statusCode, contentType, responseBody FROM fake_api_rules"
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
    db.prepare(
      "INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      rule.user,
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
    },
    {
      user: "test",
      path: "/test/user",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.TEXT,
      responseBody: "Hello, User!",
    },
    {
      user: "test",
      path: "/test/admin2",
      method: HttpMethod.POST,
      statusCode: 201,
      contentType: ContentType.JSON,
      responseBody: "Created, Administrator!",
    },
  ];
  addUser(db, "test", "test1234");
  for (const rule of rules) {
    addRule(db, rule);
  }
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