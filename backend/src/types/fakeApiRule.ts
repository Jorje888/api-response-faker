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
  FORM_URLENCODED = "application/x-www-form-urlencoded",
  FORM_DATA = "multipart/form-data",
  BINARY = "application/octet-stream",
  CSV = "text/csv",
  YAML = "application/x-yaml",
}

export enum RuleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DRAFT = "DRAFT",
  ARCHIVED = "ARCHIVED",
}

export enum ResponseType {
  STATIC = "STATIC",
  DYNAMIC = "DYNAMIC",
  CONDITIONAL = "CONDITIONAL",
  SEQUENTIAL = "SEQUENTIAL",
  TEMPLATE = "TEMPLATE",
}

export interface FakeApiRulePayload {
  id: number;
  username: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  contentType: ContentType;
  responseBody: string;
  name?: string;
  description?: string;
  status: RuleStatus;
  responseType: ResponseType;
  delay?: number;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount: number;
  tags?: string[];
  groupId?: number;
  version: number;
  conditions?: RuleCondition[];
  responses?: ConditionalResponse[];
  template?: ResponseTemplate;
}

export interface FakeApiRule {
  user: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  contentType: ContentType;
  responseBody: string;
  name?: string;
  description?: string;
  status: RuleStatus;
  responseType: ResponseType;
  delay?: number;
  headers?: Record<string, string>;
  conditions?: RuleCondition[];
  responses?: ConditionalResponse[];
  template?: ResponseTemplate;
  tags?: string[];
  groupId?: number;
}

export type RuleMap = Map<
  { user: string; path: string; method: string },
  FakeApiRule
>;

export interface RuleCondition {
  type: 'header' | 'query' | 'body' | 'path_param';
  key: string;
  operator: 'equals' | 'contains' | 'regex' | 'exists' | 'not_exists';
  value?: string;
  caseSensitive?: boolean;
}

export interface ConditionalResponse {
  conditions: RuleCondition[];
  statusCode: number;
  contentType: ContentType;
  responseBody: string;
  headers?: Record<string, string>;
  delay?: number;
}

export interface ResponseTemplate {
  variables: TemplateVariable[];
  generators: DataGenerator[];
}

export interface TemplateVariable {
  name: string;
  type: 'static' | 'dynamic' | 'generated';
  value?: string;
  generator?: string;
}

export interface DataGenerator {
  name: string;
  type: 'faker' | 'custom' | 'sequence' | 'timestamp' | 'uuid';
  config?: Record<string, any>;
}

// Log analytics interfaces
export interface RequestLog {
  id: number;
  ruleId: number;
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
  responseStatus: number;
  responseTime: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  error?: string;
}

export interface RuleAnalytics {
  ruleId: number;
  totalRequests: number;
  uniqueIps: number;
  averageResponseTime: number;
  statusCodeDistribution: Record<number, number>;
  requestsPerDay: Array<{ date: string; count: number }>;
  lastAccessed: string;
  errorRate: number;
  peakHour: number;
  averageRequestsPerHour: number;
}

export interface AnalyticsFilter {
  ruleId?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
  method?: HttpMethod;
  statusCode?: number;
  minResponseTime?: number;
  maxResponseTime?: number;
}

export interface AnalyticsSummary {
  totalRequests: number;
  uniqueUsers: number;
  uniqueRules: number;
  averageResponseTime: number;
  totalErrors: number;
  errorRate: number;
  mostActiveRule: {
    ruleId: number;
    path: string;
    requestCount: number;
  };
  busiestHour: number;
  requestsPerHour: Array<{ hour: number; count: number }>;
}

// Enhanced rule management interfaces
export interface RuleGroup {
  id: number;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  isDefault: boolean;
}

export interface RuleHistoryEntry {
  id: number;
  ruleId: number;
  version: number;
  changedAt: string;
  changedBy: string;
  changes: Partial<FakeApiRule>;
  comment?: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
}

export interface RuleSearchParams {
  search?: string;
  status?: RuleStatus[];
  methods?: HttpMethod[];
  contentTypes?: ContentType[];
  tags?: string[];
  groupId?: number;
  userId?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastUsedAfter?: string;
  sortBy?: 'name' | 'createdAt' | 'lastUsed' | 'usageCount' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface RuleSearchResult {
  rules: FakeApiRulePayload[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RuleBulkOperation {
  ruleIds: number[];
  operation: 'activate' | 'deactivate' | 'archive' | 'delete' | 'move_to_group';
  groupId?: number;
  userId: string;
}

export interface RuleImportExport {
  version: string;
  exportedAt: string;
  rules: FakeApiRulePayload[];
  groups: RuleGroup[];
  metadata: {
    totalRules: number;
    totalGroups: number;
    exportedBy: string;
  };
}
