import { FakeApiRule } from "../types/fakeApiRule";
import { Request, Response } from "express";
import Express from "express";
import Database from "better-sqlite3";
import { RuleMap, HttpMethod, ContentType } from "../types/fakeApiRule";
import * as DB from "../db";

// Store registered routes for cleanup
const registeredRoutes = new Map<string, { method: string; path: string }>();

/**
  იქმნება ახალი Express route
 
HTTP-ის მეთდს განსაზღვრავს method ატრიბუტი , სად და როგორ გაიგზავნებას path განსაზღვრვრვრვვზ,
დანარჩენი ატრიბუტები კი განსაზღვრავენ პასუხის სტატუს კოდს, ტიპს და რა დააბრუნოს.

გამოგზავნილ რექვესთში ტიპი თუ არ არის განსაზღვრული ../types/fakeApiRule <= მანდ, ამოაგდებს 415 error response.
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
   * კაროჩე, ეს ფუნქცია ამოწმებს ტაიპის სისწორე/შესაბამისობას
   * ნერდული ეიაიური ახსნა დაუნ ბილოუ 
   * 
   * 
   * Middleware function to check that the request's 'Content-Type' header
   * matches the 'contentType' specified in the rule. If the headers do not
   * match, the middleware sends a 415 error response. If the headers match,
   * the middleware calls the next function in the middleware chain.
   * @param req The Express Request object.
   * @param res The Express Response object.
   * @param next The next function in the middleware chain.
   * 
   */
  const requestContentTypeMatcher = (
    req: Request,
    res: Response,
    next: Function
  ) => {
    // ვსქიფოთ სანამ გეტ რექვესთებამდე არ მივალთ
    if (req.method === 'GET') {
      return next();
    }

    const requestContentType = req.headers["content-type"];
    const expectedContentType = rule.contentType
      .toLowerCase()
      .split(";")[0]
      .trim();
    const actualContentType = requestContentType
      ? requestContentType.toLowerCase().split(";")[0].trim()
      : "";

    if (actualContentType === expectedContentType || !requestContentType) {
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
  const routeKey = `${method}:${rule.path}`;
  
  // Remove existing route if it exists
  if (registeredRoutes.has(routeKey)) {
    removeRoute(app, rule.path, rule.method);
  }

  // Register the new route
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
      return;
  }

  // Track the registered route
  registeredRoutes.set(routeKey, { method: rule.method, path: rule.path });
  console.log(`Registered fake API route: ${rule.method} ${rule.path}`);
}

/**

 * ვინაიდან ექსპრესის რეტარდებმა ვერ მოტვინეს რომ ხანდახან როუტები შეიძლება და წავშალოთ
 * როგორც იტყოდა ემინემი THIS LOOKS LIKE A JOB FOR ME

 */
export function removeRoute(app: Express.Express, path: string, method: string) {
  const routeKey = `${method.toLowerCase()}:${path}`;
  
  try {
    // Access the router's stack (this is implementation-specific to Express)
    const router = (app as any)._router;
    if (!router || !router.stack) {
      console.warn('Unable to access Express router stack for route removal');
      return;
    }

    // Filter out the route we want to remove
    const methodLower = method.toLowerCase();
    router.stack = router.stack.filter((layer: any) => {
      if (layer.route) {
        const routePath = layer.route.path;
        const routeMethods = Object.keys(layer.route.methods);
        const hasMethod = routeMethods.includes(methodLower) || routeMethods.includes('_all');
        
        if (routePath === path && hasMethod) {
          console.log(`Removed fake API route: ${method} ${path}`);
          return false; // Remove this layer
        }
      }
      return true; // Keep other layers
    });

    // Remove from our tracking
    registeredRoutes.delete(routeKey);
  } catch (error) {
    console.error(`Error removing route ${method} ${path}:`, error);
  }
}

/**
ეგ მართლაც ელემენტარულია და გასაგებია
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
 * თურმე ეგეც საჭიროა
 * მერე შეიძლება შეიცვალოს ვინაიდან ფრონტში არ ჩამიხედავს დიდად და დაჩისთან გავარკვევ ფ2ფ
 * 
 * 
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

/**
გეთოლ
 */
export function getRegisteredRoutes(): Array<{ method: string; path: string }> {
  return Array.from(registeredRoutes.values());
}

/**
ამოვგადავშალოთ ყველა რეგისტრირებული როუტი
 */
export function clearAllRoutes(app: Express.Express) {
  const routes = Array.from(registeredRoutes.values());
  routes.forEach(route => {
    removeRoute(app, route.path, route.method);
  });
}