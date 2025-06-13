import assert from "assert";
import Database from "better-sqlite3";
import "mocha";
import { FakeApiRule, HttpMethod, ContentType } from "../src/types/fakeApiRule";
import { initializeDB, getAllRulesByUsername, addRule } from "../src/db";

/**
 * Testing strategy for db.initializeDB():
 *
 * Test that the function returns a live Database object.
 * Test that the function creates the fake_api_rules table if it doesn't exist.
 * Test that the function creates the users table if it doesn't exist.
 * Check that NOT NULL is upheld for all columns in both tables.
 * Check that the UNIQUE constraint is upheld for appropriate columns.
 * Check that the PRIMARY KEY constraint is upheld.
 *
 */
describe("initializeDB", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = initializeDB();
  });
  afterEach(() => {
    db.close();
  });

  it("Should return a live Database object", () => {
    assert(db instanceof Database);
    assert(db.open, "Database should be open");
  });

  it("Should create the fake_api_rules table if it doesn't exist", () => {
    const tableInfo = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='fake_api_rules'"
      )
      .get();
    assert.deepStrictEqual(tableInfo, { name: "fake_api_rules" });
  });

  it("Should create the users table if it doesn't exist", () => {
    const tableInfo = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      )
      .get();
    assert.deepStrictEqual(tableInfo, { name: "users" });
  });

  it("Should uphold NOT NULL constraint for fake_api_rules columns", () => {
    // Attempt to insert a row with a NULL path
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES
         ('testuser', NULL, 'GET', 200, 'application/json', 'body')`
      ).run();
    }, /NOT NULL constraint failed: fake_api_rules.path/);

    // Attempt to insert a row with a NULL method
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES
         ('testuser', '/api/test', NULL, 200, 'application/json', 'body')`
      ).run();
    }, /NOT NULL constraint failed: fake_api_rules.method/);

    // Attempt to insert a row with a NULL statusCode
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES
         ('testuser', '/api/test', 'GET', NULL, 'application/json', 'body')`
      ).run();
    }, /NOT NULL constraint failed: fake_api_rules.statusCode/);

    // Attempt to insert a row with a NULL contentType
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES
         ('testuser', '/api/test', 'GET', 200, NULL, 'body')`
      ).run();
    }, /NOT NULL constraint failed: fake_api_rules.contentType/);

    // Attempt to insert a row with a NULL responseBody
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES
         ('testuser', '/api/test', 'GET', 200, 'application/json', NULL)`
      ).run();
    }, /NOT NULL constraint failed: fake_api_rules.responseBody/);

    // Attempt to insert a row with a NULL username
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES
         (NULL, '/api/test', 'GET', 200, 'application/json', 'body')`
      ).run();
    }, /NOT NULL constraint failed: fake_api_rules.username/);
  });

  it("Should uphold NOT NULL constraint for users columns", () => {
    // Attempt to insert a user with a NULL username
    assert.throws(() => {
      db.prepare(
        `INSERT INTO users (username, hashPass) VALUES (NULL, 'somehash')`
      ).run();
    }, /NOT NULL constraint failed: users.username/);

    // Attempt to insert a user with a NULL hashPass
    assert.throws(() => {
      db.prepare(
        `INSERT INTO users (username, hashPass) VALUES ('testuser', NULL)`
      ).run();
    }, /NOT NULL constraint failed: users.hashPass/);
  });

  it("Should uphold UNIQUE constraint for fake_api_rules (username, path, method)", () => {
    const rule = {
      username: "user1",
      path: "/api/rule1",
      method: "GET",
      statusCode: 200,
      contentType: "application/json",
      responseBody: "body",
    };
    // Ensure the user exists before inserting the rule
    db.prepare(
      `INSERT OR IGNORE INTO users (username, hashPass) VALUES (?, ?)`
    ).run(rule.username, "dummyhash");

    db.prepare(
      `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      rule.username,
      rule.path,
      rule.method,
      rule.statusCode,
      rule.contentType,
      rule.responseBody
    );

    // Attempt to insert the exact same rule again (should fail on unique constraint)
    assert.throws(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        rule.username,
        rule.path,
        rule.method,
        rule.statusCode,
        rule.contentType,
        rule.responseBody
      );
    }, /UNIQUE constraint failed: fake_api_rules.username, fake_api_rules.path, fake_api_rules.method/);

    // Attempt to insert a rule with the same path and method but different username (should succeed)
    const rule2 = { ...rule, username: "user2" };
    db.prepare(
      `INSERT OR IGNORE INTO users (username, hashPass) VALUES (?, ?)`
    ).run(rule2.username, "dummyhash");

    assert.doesNotThrow(() => {
      db.prepare(
        `INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        rule2.username,
        rule2.path,
        rule2.method,
        rule2.statusCode,
        rule2.contentType,
        rule2.responseBody
      );
    });
  });

  it("Should uphold UNIQUE constraint for users.username", () => {
    db.prepare(
      `INSERT INTO users (username, hashPass) VALUES ('testuser', 'pass1')`
    ).run();

    // Attempt to insert a user with the same username
    assert.throws(() => {
      db.prepare(
        `INSERT INTO users (username, hashPass) VALUES ('testuser', 'pass2')`
      ).run();
    }, /UNIQUE constraint failed: users.username/);
  });
});

/**
 * Testing strategy for getAllRules():
 *
 * 1. Should throw an error if the database is not properly initialized (e.g., table not created).
 * 2. Should return an empty array if no rules exist for a given user.
 * 3. Should return an array of all rules belonging to a specific user.
 * 4. Should not return rules belonging to other users.
 *
 */
describe("getAllRulesByUsername", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initializeDB();
    // Ensure 'testuser' exists for rules to be added to it
    db.prepare(
      `INSERT OR IGNORE INTO users (username, hashPass) VALUES (?, ?)`
    ).run("testuser", "dummyhash");
    db.prepare(
      `INSERT OR IGNORE INTO users (username, hashPass) VALUES (?, ?)`
    ).run("user1", "dummyhash");
    db.prepare(
      `INSERT OR IGNORE INTO users (username, hashPass) VALUES (?, ?)`
    ).run("user2", "dummyhash");
    db.prepare(
      `INSERT OR IGNORE INTO users (username, hashPass) VALUES (?, ?)`
    ).run("anotherUser", "dummyhash");
  });

  afterEach(() => {
    db.close();
  });

  it("Should throw an error if the fake_api_rules table does not exist", () => {
    const uninitializedDb = new Database(":memory:");
    // Manually drop the table to simulate an uninitialized state for this specific test
    uninitializedDb.exec("DROP TABLE IF EXISTS fake_api_rules;");
    assert.throws(() => {
      getAllRulesByUsername(uninitializedDb, "anyUser");
    }, /no such table: fake_api_rules/);
    uninitializedDb.close();
  });

  it("Should return an empty array if no rules exist for a specific user", () => {
    db.prepare(
      "INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("anotherUser", "/api/ruleX", "GET", 200, "application/json", "body");

    assert.deepStrictEqual(getAllRulesByUsername(db, "user1"), []);
  });

  it("Should return an array of all rules for a specific user", () => {
    const user1Rules: FakeApiRule[] = [
      {
        user: "user1",
        path: "/api/rule1",
        method: HttpMethod.GET,
        statusCode: 200,
        contentType: ContentType.JSON,
        responseBody: "body1",
      },
      {
        user: "user1",
        path: "/api/rule2",
        method: HttpMethod.POST,
        statusCode: 201,
        contentType: ContentType.TEXT,
        responseBody: "body2",
      },
    ];

    const user2Rule: FakeApiRule = {
      user: "user2",
      path: "/api/rule3",
      method: HttpMethod.PUT,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body3",
    };

    // Insert rules for user1
    user1Rules.forEach((rule) => {
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
    });

    // Insert a rule for user2
    db.prepare(
      "INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      user2Rule.user,
      user2Rule.path,
      user2Rule.method,
      user2Rule.statusCode,
      user2Rule.contentType,
      user2Rule.responseBody
    );

    const retrievedRules = getAllRulesByUsername(db, "user1");
    retrievedRules.sort((a, b) => a.path.localeCompare(b.path));
    user1Rules.sort((a, b) => a.path.localeCompare(b.path));
    assert.deepStrictEqual(retrievedRules, user1Rules);
  });

  it("Should not return rules belonging to other users", () => {
    const user1Rule: FakeApiRule = {
      user: "user1",
      path: "/api/user1rule",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "user1body",
    };
    const user2Rule: FakeApiRule = {
      user: "user2",
      path: "/api/user2rule",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "user2body",
    };

    db.prepare(
      "INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      user1Rule.user,
      user1Rule.path,
      user1Rule.method,
      user1Rule.statusCode,
      user1Rule.contentType,
      user1Rule.responseBody
    );
    db.prepare(
      "INSERT INTO fake_api_rules (username, path, method, statusCode, contentType, responseBody) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      user2Rule.user,
      user2Rule.path,
      user2Rule.method,
      user2Rule.statusCode,
      user2Rule.contentType,
      user2Rule.responseBody
    );

    // Test for user1's rules
    assert.deepStrictEqual(getAllRulesByUsername(db, "user1"), [user1Rule]);
    // Test for user2's rules
    assert.deepStrictEqual(getAllRulesByUsername(db, "user2"), [user2Rule]);
  });
});

/**
 * Testing strategy for addRule():
 *
 * 1. Should throw an error if the database connection is not properly initialized.
 * 2. Should throw an error if any required field in the FakeApiRule object is missing or null.
 * 3. Should throw an error if the username is null or an empty string.
 * 4. Should successfully add a valid rule to the database for a specific user.
 * 5. Should not add a rule if a rule with the same (username, path, method) already exists.
 *
 */
describe("addRule", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initializeDB();
    // Ensure the users table has at least one user for foreign key constraint checks if applicable
    db.prepare(
      `INSERT OR IGNORE INTO users (username, hashPass) VALUES (?, ?)`
    ).run("testuser", "dummyhash");
  });

  afterEach(() => {
    db.close();
  });

  it("Should throw an error if the database connection is not properly initialized", () => {
    const uninitializedDb = new Database(":memory:");
    // Manually drop the table to simulate an uninitialized state for this specific test
    uninitializedDb.exec("DROP TABLE IF EXISTS fake_api_rules;");
    const rule: FakeApiRule = {
      user: "testuser",
      path: "/api/test",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body",
    };
    assert.throws(() => {
      addRule(uninitializedDb, rule);
    }, /no such table: fake_api_rules/);
    uninitializedDb.close();
  });

  it("Should throw an error if any required rule field is missing or null", () => {
    const baseRule: FakeApiRule = {
      user: "testuser",
      path: "/api/test",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body",
    };

    // Test cases for missing/null fields
    const invalidRules = [
      { ...baseRule, user: undefined },
      { ...baseRule, user: null },
      { ...baseRule, path: undefined },
      { ...baseRule, path: null },
      { ...baseRule, method: undefined },
      { ...baseRule, method: null },
      { ...baseRule, statusCode: undefined },
      { ...baseRule, statusCode: null },
      { ...baseRule, contentType: undefined },
      { ...baseRule, contentType: null },
      { ...baseRule, responseBody: undefined },
      { ...baseRule, responseBody: null },
    ];

    for (const invalidRule of invalidRules) {
      assert.throws(
        () => {
          addRule(db, invalidRule as unknown as FakeApiRule);
        },
        Error,
        `Should throw for missing/null field: ${JSON.stringify(invalidRule)}`
      );
    }
  });

  it("Should throw an error if the username is null or an empty string", () => {
    const rule: FakeApiRule = {
      user: "",
      path: "/api/test",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body",
    };

    assert.throws(
      () => {
        addRule(db, rule);
      },
      Error,
      "Should throw for null username"
    );

    assert.throws(
      () => {
        addRule(db, rule);
      },
      Error,
      "Should throw for empty username"
    );
  });

  it("Should successfully add a valid rule to the database", () => {
    const rule: FakeApiRule = {
      user: "testuser",
      path: "/api/rule1",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "body content",
    };
    const username = "testuser";

    addRule(db, rule);

    // Verify the rule was added by retrieving it using getAllRules with the username
    const rulesInDb = getAllRulesByUsername(db, username);

    assert.deepStrictEqual(rulesInDb, [rule]);
  });

  it("Should not add a rule if a rule with the same (username, path, method) already exists", () => {
    const rule: FakeApiRule = {
      user: "testuser",
      path: "/api/duplicate",
      method: HttpMethod.GET,
      statusCode: 200,
      contentType: ContentType.JSON,
      responseBody: "initial body",
    };
    const username = "testuser";

    addRule(db, rule);
    assert.throws(() => {
      addRule(db, rule);
    }, /UNIQUE constraint failed: fake_api_rules.username, fake_api_rules.path, fake_api_rules.method/);

    // Verify that only one rule exists using getAllRules
    const rulesInDb = getAllRulesByUsername(db, username);
    assert.strictEqual(rulesInDb.length, 1);
    assert.deepStrictEqual(rulesInDb[0], rule);
  });
});
