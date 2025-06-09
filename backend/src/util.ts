import FakeApiRule from "./types/fakeApiRule";
import { Request, Response } from "express";
import Express from "express";
import Database from "better-sqlite3";
import { RuleMap, HttpMethod, ContentType } from "./types/fakeApiRule";
import * as DB from "./db";

export function fakeARule(rule: FakeApiRule, app: Express.Express) {
  const responseHandler = (req: Request, res: Response) => {
    res.status(rule.statusCode);
    res.setHeader("Content-Type", rule.contentType);
    // TODO: convert responseBody to rule.contentType
    res.send(rule.responseBody);
  };

  const requestContentTypeMatcher = (
    req: Request,
    res: Response,
    next: Function
  ) => {
    const requestContentType = req.headers["content-type"];
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
}

export function createRule(
  rule: FakeApiRule,
  db: Database.Database,
  mapping: RuleMap,
  app: Express.Express
) {
  if (
    !rule.path ||
    !rule.method ||
    !rule.statusCode ||
    !rule.contentType ||
    !rule.responseBody
  ) {
    throw new Error("Rule cannot contain an empty field");
  }

  if (!(rule.method in HttpMethod)) {
    throw new Error(
      `Rule method '${
        rule.method
      }' must be of type HttpMethod. Supported values are ${Object.values(
        HttpMethod
      ).join(", ")}.`
    );
  }

  if (!(rule.contentType in ContentType)) {
    throw new Error(
      `Rule contentType '${
        rule.contentType
      }' must be of type ContentType. Supported values are ${Object.values(
        ContentType
      ).join(", ")}.`
    );
  }

  DB.addRule(db, rule);
  mapping.set({ path: rule.path, method: rule.method }, rule);
  fakeARule(rule, app);
}
