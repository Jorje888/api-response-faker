export interface FakeApiRulePayload {
  id: number;
  username: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  contentType: ContentType;
  responseBody: string;
}

export interface FakeApiRule {
  user: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  contentType: ContentType;
  responseBody: string;
}

export type RuleMap = Map<
  { user: string; path: string; method: string },
  FakeApiRule
>;

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
  ALL = "ALL",
}

export enum ContentType {
  JSON = "application/json",
  TEXT = "text/plain",
  HTML = "text/html",
  XML = "application/xml",
}
