import assert from "assert";
import Database from "better-sqlite3";
import "mocha";
import FakeApiRule from "../src/types/fakeApiRule";
import { initializeDB, getAllRules, getRuleByPath, addRule } from "../src/db";

/**
 * Testing strategy for db.initializeDB():
 *
 * 1. Test that the function returns a live Database object.
 * 2. Test that the function creates the fake_api_rules table if it doesn't exist.
 * 3. Check that NOT NULL is upheld for all columns.
 * 4. Check that the unique constraint is upheld.
 * 5. Check that the primary key constraint is upheld.
 *
 */
describe("initializeDB", () => {
  it("Should return a live Database object", () => {
    const db = initializeDB();
    assert(db instanceof Database);
  });
  it("Should create the fake_api_rules table if it doesn't exist", () => {
    const db = initializeDB();
    assert.equal(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='fake_api_rules'"
        )
        .get(),
      { name: "fake_api_rules" }
    );
  });
  it("Should uphold NOT NULL for all columns", () => {
    const db = initializeDB();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (path, method, status_code, content_type, response_body) VALUES
         (NULL, 'GET', 200, 'application/json', 'body'), 
         ('/api/rule1', NULL, 200, 'application/json', 'body'), 
         ('/api/rule2', 'GET', NULL, 'application/json', 'body'),
         ('/api/rule3', 'GET', 200, NULL, 'body'), 
         ('/api/rule4', 'GET', 200, 'application/json', NULL)`
      ).run({ throwOnConflict: true });
    });
  });
});
