export default interface FakeApiRule {
  id: number;
  path: string;
  method: string;
  statusCode: number;
  contentType: string;
  responseBody: string;
}
