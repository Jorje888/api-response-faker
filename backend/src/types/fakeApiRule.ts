export interface FakeApiRulePayload {
  id: number;
  path: string;
  method: string;
  statusCode: number;
  contentType: string;
  responseBody: string;
}

export default interface FakeApiRule {
  path: string;
  method: string;
  statusCode: number;
  contentType: string;
  responseBody: string;
}
