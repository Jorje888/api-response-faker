import { FakeApiRule } from "./types/fakeApiRule";
import { Request, Response } from "express";
import Express from "express";
import Database from "better-sqlite3";
import { RuleMap, HttpMethod, ContentType } from "./types/fakeApiRule";
import * as DB from "./db";

/**
 * Dynamically registers an Express route for a single FakeApiRule.
 *
 * The HTTP method used to register the route is determined by the rule's `method` property.
 * The route path is determined by the rule's `path` property.
 * The route handler sends a response with the status code, content type, and response body
 * specified by the rule.
 *
 * If the rule's `contentType` property specifies a content type, the route will also check
 * that the request has the same content type. If the content types do not match, the route
 * handler will send a 415 error response.
 *
 * @param rule The FakeApiRule to register a route for.
 * @param app The Express application to register the route with.
 */
export function fakeARule(rule: FakeApiRule, app: Express.Express) {
  const responseHandler = (req: Request, res: Response) => {
    res.status(rule.statusCode);
    res.setHeader("Content-Type", rule.contentType);
    res.send(formatMessage(rule.responseBody, rule.contentType));
  };

  /**
   * Middleware function to check that the request's 'Content-Type' header
   * matches the 'contentType' specified in the rule. If the headers do not
   * match, the middleware sends a 415 error response. If the headers match,
   * the middleware calls the next function in the middleware chain.
   * @param req The Express Request object.
   * @param res The Express Response object.
   * @param next The next function in the middleware chain.
   */
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

/**
 * Creates a fake API rule and persists it to the database. Registers the rule
 * to the in-memory mapping of rules. Dynamically registers an Express route
 * for the rule.
 * @param {FakeApiRule} rule - The rule to be created and persisted.
 * @param {Database.Database} db - The database connection to use for the operation.
 * @param {RuleMap} mapping - The in-memory mapping of rules.
 * @param {Express.Express} app - The Express application to register the route with.
 * @throws Will throw an error if the rule contains an empty field.
 * @throws Will throw an error if the rule method is not of type HttpMethod.
 * @throws Will throw an error if the rule contentType is not of type ContentType.
 */
export function createRule(
  rule: FakeApiRule,
  db: Database.Database,
  mapping: RuleMap,
  app: Express.Express
) {
  if (
    !rule.user ||
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
  mapping.set({ user: rule.user, path: rule.path, method: rule.method }, rule);
  fakeARule(rule, app);
}

/**
 * Formats a message string according to the specified content type.
 *
 * @param {string} message - The message to be formatted.
 * @param {ContentType} contentType - The content type to format the message as.
 * @returns {string} The formatted message.
 *
 * Formats supported:
 * - "application/json": Returns the message as a JSON string.
 * - "text/plain": Returns the message as plain text.
 * - "text/html": Wraps the message in an HTML document structure.
 * - "application/xml": Wraps the message in an XML structure.
 * Returns the message as-is for unsupported content types.
 */
function formatMessage(message: string, contentType: ContentType): string {
  switch (contentType) {
    case "application/json":
      return JSON.stringify({ message });
    case "text/plain":
      return message;
    case "text/html":
      return `<!DOCTYPE html><html><head><title>Message</title></head><body><p>${message}</p></body></html>`;
    case "application/xml":
      return `<?xml version="1.0" encoding="UTF-8"?><message>${message}</message>`;
    default:
      return message;
  }
}
