import express from "express";
import FakeApiRule from "./types/fakeApiRule";
import { RuleMap, HttpMethod, ContentType } from "./types/fakeApiRule";
import * as DB from "./db";
import { createRule, fakeARule } from "./util";

// Initialize express application
const app = express();
const PORT = process.env.PORT || 3000;

// Gather database rules into a map for easier lookUp
const fake_api_rules: Map<{ path: string; method: string }, FakeApiRule> =
  new Map();
const db = DB.initializeDB();
const rules = DB.getAllRules(db);
rules.forEach((rule) => {
  fake_api_rules.set({ path: rule.path, method: rule.method }, rule);
});

// Listend to the spevified port
rules.forEach((rule) => {
  fakeARule(rule, app);
});

/**
 * When implementing a handler for a request from frontend that adds a new rule
 * use the addRule utility function instead of adding it manually
 */

// Listen to the spevified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
