import request from "supertest";
import express from "express";
import { initializeRouter } from "../src/routes/ruleManager";
import { initializeDB, seedDatabase } from "../src/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret";

describe("RuleManager Router", () => {
  let token: string;
  let createdRuleId: number;
  let app: express.Express;
  let db: any;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    db = await initializeDB();
    await seedDatabase(db);

    // Add 'admin' user to satisfy FK constraint for tests
    db.prepare("INSERT INTO users (username, hashPass) VALUES (?, ?)").run(
      "admin",
      "dummyhash"
    );

    app = express();
    app.use(express.json());
    app.use("/", initializeRouter(db, app));

    token = jwt.sign({ username: "admin" }, JWT_SECRET);

    // Create a rule with responseBody as string (DB expects TEXT)
    const createRes = await request(app)
      .post("/")
      .set("Authorization", `Bearer ${token}`)
      .send({
        path: "/lookup",
        method: "GET",
        statusCode: 200,
        contentType: "application/json",
        responseBody: JSON.stringify({ message: "OK" }),
      });

    console.log("Create Rule Response:", createRes.statusCode, createRes.body);

    createdRuleId = createRes.body?.rule?.id;

    // After create rule
createdRuleId = createRes.body?.rule?.id;

// If id is undefined, fetch it manually:
if (!createdRuleId) {
  // Get all rules for 'admin' user and find the one with path '/lookup'
  const rules = db
    .prepare(
      `SELECT id, username, path, method, statusCode, contentType, responseBody FROM fake_api_rules WHERE username = ?`
    )
    .all("admin");

  const rule = rules.find((r: { path: string; method: string }) => r.path === "/lookup" && r.method === "GET");
  createdRuleId = rule?.id;
}

  });

  it("GET /:id - should get rule by ID", async () => {
    const res = await request(app)
      .get(`/${createdRuleId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.path).toBe("/lookup");

    // Parse responseBody string to object to verify contents
    const responseBodyObj = JSON.parse(res.body.responseBody);
    expect(responseBodyObj.message).toBe("OK");
  });

  it("PUT /:id - should update rule", async () => {
    const res = await request(app)
      .put(`/${createdRuleId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        path: "/rules",
        method: "GET",
        statusCode: 202,
        contentType: "application/json",
        responseBody: JSON.stringify({ message: "Updated" }),
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.rule.statusCode).toBe(202);

    const updatedResponseBody = JSON.parse(res.body.rule.responseBody);
    expect(updatedResponseBody.message).toBe("Updated");
  });

  it("DELETE /:id - should delete rule", async () => {
    const res = await request(app)
      .delete(`/${createdRuleId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(204);
  });
});
