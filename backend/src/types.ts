export interface FakeApiRule {
    id: number;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    statusCode: number;
    contentType: string;
    responseBody: string; 
}