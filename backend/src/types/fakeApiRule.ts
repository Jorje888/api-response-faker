export interface FakeApiRulePayload {
  id: number;
  path: string;
  method: HttpMethod;
  statusCode: number;
  contentType: ContentType;
  responseBody: string;
}

export default interface FakeApiRule {
  path: string;
  method: HttpMethod;
  statusCode: number;
  contentType: ContentType;
  responseBody: string;
}

export type RuleMap = Map<{ path: string; method: string }, FakeApiRule>;

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
