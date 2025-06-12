export interface FakeApiRulePayload {
  id: number;
  path: string;
  method: string;
  statusCode: number;
  contentType: string;
  responseBody: string;
}

export default interface FakeApiRuleRequest {
  path: string;
  method: string;
  statusCode: number;
  contentType: string;
  responseBody: string;
}
