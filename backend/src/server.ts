import { Request, Response } from "express";
import express from "express";
import FakeApiRule from "./types/fakeApiRule";
import * as DB from "./db";
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

rules.forEach((rule) => {
  const responseHandler = (req: Request, res: Response) => {
    res.status(rule.statusCode);
    res.setHeader("Content-Type", rule.contentType);
    // TODO: convert responseBody to rule.contentType
    res.send(rule.responseBody);
  };

  // 2. Define the middleware for matching the incoming Content-Type
  const requestContentTypeMatcher = (
    req: Request,
    res: Response,
    next: Function
  ) => {
    const requestContentType = req.headers["content-type"];

    // Normalize content types for comparison (e.g., remove charset or other parameters)
    const expectedContentType = rule.contentType
      .toLowerCase()
      .split(";")[0]
      .trim();
    const actualContentType = requestContentType
      ? requestContentType.toLowerCase().split(";")[0].trim()
      : "";

    if (actualContentType === expectedContentType) {
      next();
    } else {
      res
        .status(415)
        .send(
          `Unsupported Media Type. Expected 'Content-Type: ${rule.contentType}'`
        );
    }
  };
  const method = rule.method.toLowerCase();

  switch (method) {
    case "get":
      app.get(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    case "post":
      app.post(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    case "put":
      app.put(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    case "delete":
      app.delete(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    case "patch":
      app.patch(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    case "options":
      app.options(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    case "head":
      app.head(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    case "all":
      app.all(rule.path, requestContentTypeMatcher, responseHandler);
      break;
    default:
      console.warn(
        `Unsupported HTTP method: '${rule.method}' for path '${rule.path}'. Skipping rule.`
      );
  }
});

// Listend to the spevified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
