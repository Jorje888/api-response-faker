import assert from "assert";
import Database from "better-sqlite3";
import "mocha";
import FakeApiRule from "../src/types/fakeApiRule";
import {
  FakeApiRulePayload,
  HttpMethod,
  ContentType,
} from "../src/types/fakeApiRule";
import { initializeDB, getAllRules, addRule } from "../src/db";

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
    assert.deepEqual(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='fake_api_rules'"
        )
        .get(),
      { name: "fake_api_rules" }
    );
  });
  it("Should check existence of fake_api_rules table", () => {
    const db = initializeDB();
    assert.deepEqual(
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
        `INSERT INTO fake_api_rules (path, method, statusCode, contentType, responseBody) VALUES
         (NULL, 'GET', 200, 'application/json', 'body'), 
         ('/api/rule1', NULL, 200, 'application/json', 'body'), 
         ('/api/rule2', 'GET', NULL, 'application/json', 'body'),
         ('/api/rule3', 'GET', 200, NULL, 'body'), 
         ('/api/rule4', 'GET', 200, 'application/json', NULL)`
      ).run({ throwOnConflict: true });
    });
  });
  it("Should uphold unique constraint", () => {
    const db = initializeDB();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (path, method, statusCode, contentType, responseBody) VALUES
         ('/api/rule1', 'GET', 200, 'application/json', 'body'), 
         ('/api/rule1', 'GET', 200, 'application/json', 'body')`
      ).run({ throwOnConflict: true });
    });
  });
});

/**
 * Testing strategy for getAllRules():
 *
 * 1. Should throw an error if the database is not initialized.
 * 2. Should return epty array if no rules exist.
 * 3. Should return an array of all rules.
 *
 */
describe("getAllRules", () => {
  it("Should throw an error if the database is not initialized", () => {
    assert.throws(() => {
      getAllRules(new Database(":memory:"));
    });
  });
  it("Should return empty array if no rules exist", () => {
    const db = initializeDB();
    assert.deepEqual(getAllRules(db), []);
  });
  it("Should return an array of all rules", () => {
    const db = initializeDB();
    const rule1: FakeApiRule = {
      path: "/api/rule1",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body",
    };
    const rule2: FakeApiRule = {
      path: "/api/rule2",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body",
    };
    db.prepare(
      "INSERT INTO fake_api_rules (path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?)"
    ).run(
      rule1.path,
      rule1.method,
      rule1.statusCode,
      rule1.contentType,
      rule1.responseBody
    );
    db.prepare(
      "INSERT INTO fake_api_rules (path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?)"
    ).run(
      rule2.path,
      rule2.method,
      rule2.statusCode,
      rule2.contentType,
      rule2.responseBody
    );
    assert.deepEqual(getAllRules(db), [rule1, rule2]);
  });
});

/**
 * Testing strategy for addRule():
 *
 * 1. Should throw an error if the database variable is null.
 * 2. Should throw an error for any rule field is null
 * 3. Should add the valid rule to the database
 *
 */
describe("addRule", () => {
  it("Should throw an error if the database variable is null ", () => {
    assert.throws(() => {
      addRule(new Database(":memory:"), {} as FakeApiRule);
    });
  });
  it("Should throw an error for any rule field that is null", () => {
    const db = initializeDB();
    const rules = [
      {
        path: "/api/rule1",
        method: "GET",
        statusCode: 200,
        contentType: "application/json",
      },
      {
        path: "/api/rule3",
        method: "GET",
        statusCode: 200,
        responseBody: "body",
      },
      {
        path: "/api/rule4",
        method: "GET",
        contentType: "application/json",
        responseBody: "body",
      },
      {
        path: "/api/rule5",
        statusCode: 200,
        contentType: "application/json",
        responseBody: "body",
      },
      {
        path: "/api/rule6",
        method: "GET",
        statusCode: 200,
        contentType: "application/json",
        responseBody: "body",
      },
    ];
    for (let i = 0; i < rules.length - 1; i++) {
      assert.throws(() => {
        addRule(db, rules[i] as FakeApiRule);
      }, Error);
    }
  });

  it("Should add the valid rule to the database", () => {
    const db = initializeDB();
    const rule: FakeApiRule = {
      path: "/api/rule1",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body",
    };
    addRule(db, rule);
    assert.deepEqual(getAllRules(db), [rule]);
  });
});
