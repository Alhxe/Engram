export type NodeKind = "NOTE" | "MINDMAP_BRANCH" | "SNIPPET" | "BOOKMARK";

export type PageLayout = "DOCUMENT" | "MINDMAP" | "TABLE" | "BOARD" | "CALENDAR" | "CHART";

export type PropertyType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "CHECKBOX"
  | "URL"
  | "EMAIL"
  | "MULTISELECT"
  | "RATING"
  | "RELATION";

export interface WebhookResponse {
  id: string;
  url: string;
  enabled: boolean;
  createdAt: string | null;
}

export interface SavedView {
  id: string;
  name: string;
  mode: string | null;
  groupBy: string | null;
  dateBy: string | null;
  sortCol: string | null;
  sortDir: number;
  filterText: string | null;
}

export interface PropertyDto {
  name: string;
  type: PropertyType;
  value: string | null;
}

export interface SchemaField {
  name: string;
  type: PropertyType;
  options?: string[] | null;
}

export interface SmartQuery {
  tags: string[];
  propertyName: string | null;
  propertyValue: string | null;
}

export interface PropertyBacklink {
  nodeId: string;
  title: string;
  propertyName: string;
}

export interface LinkSuggestion {
  targetId: string;
  title: string;
  relType: string;
  reason: string;
}

export interface DuplicateSuggestion {
  nodeId: string;
  title: string;
  reason: string;
}

export interface HygieneResponse {
  orphans: NodeTreeItem[];
  untagged: NodeTreeItem[];
  stale: NodeTreeItem[];
}

export interface NodeResponse {
  id: string;
  title: string;
  content: string | null;
  kind: NodeKind;
  layout: PageLayout;
  parentId: string | null;
  hasChildren: boolean;
  favorite: boolean;
  template: boolean;
  shareToken: string | null;
  schema: SchemaField[];
  smartQuery: SmartQuery | null;
  tags: string[];
  properties: PropertyDto[];
  mapX: number | null;
  mapY: number | null;
  mapColor: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubjectReview {
  id: string;
  title: string;
  due: number;
  total: number;
}

export interface PageRef {
  id: string;
  title: string;
  layout: PageLayout;
}

export interface DashboardResponse {
  dueCards: number;
  subjects: SubjectReview[];
  recent: PageRef[];
  openQuestions: PageRef[];
  resurface: PageRef | null;
}

export interface TaskItem {
  pageId: string;
  pageTitle: string;
  text: string;
  done: boolean;
}

export interface StatsResponse {
  total: number;
  unseen: number;
  learning: number;
  mature: number;
  due: number;
  subjects: SubjectReview[];
}

export interface GardenEntry {
  token: string;
  title: string;
}

export interface GuideSection {
  title: string;
  content: string | null;
}

export interface CreateNodeRequest {
  title: string;
  content?: string | null;
  kind?: NodeKind;
  layout?: PageLayout;
  parentId?: string | null;
  tags?: string[];
}

export type UpdateNodeRequest = CreateNodeRequest;

export interface NodeTreeItem {
  id: string;
  title: string;
  kind: NodeKind;
  layout: PageLayout;
  hasChildren: boolean;
}

export interface BreadcrumbItem {
  id: string;
  title: string;
}

/** One page in the global graph — id/title/parent only, so the whole base fits in one response. */
export interface GlobalGraphItem {
  id: string;
  title: string;
  parentId: string | null;
}

export interface TagResponse {
  id: string;
  name: string;
}

export interface LinkResponse {
  id: string;
  sourceId: string;
  targetId: string;
  relType: string | null;
  createdAt: string | null;
}

export interface BacklinkResponse {
  linkId: string;
  nodeId: string;
  title: string;
  kind: NodeKind;
  relType: string | null;
}

export interface GraphNodeDto {
  id: string;
  title: string;
  center: boolean;
}

export interface GraphEdgeDto {
  sourceId: string;
  targetId: string;
  relType: string | null;
}

export interface LocalGraphResponse {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
}

export interface UnlinkedMention {
  nodeId: string;
  title: string;
}

export interface RevisionResponse {
  id: string;
  createdAt: string | null;
  title: string;
  preview: string;
}

export interface SearchHit {
  nodeId: string;
  title: string;
  snippet: string | null;
  kind: NodeKind;
  titleMatch: boolean;
  tagMatch: boolean;
  propertyMatch: boolean;
}

export interface TagHit {
  id: string;
  name: string;
  count: number;
}

export interface SearchResponse {
  tags: TagHit[];
  pages: PageResponse<SearchHit>;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MapSummary {
  id: string;
  name: string;
  parentNodeId: string | null;
  createdAt: string | null;
}

export interface MapPlacement {
  nodeId: string;
  title: string;
  kind: NodeKind;
  x: number;
  y: number;
  color: string | null;
}

export interface MapEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface MapDetail {
  id: string;
  name: string;
  parentNodeId: string | null;
  placements: MapPlacement[];
  edges: MapEdge[];
}

export interface AttachmentResponse {
  id: string;
  nodeId: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number;
  createdAt: string | null;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export type ApiKeyScope = "READ" | "WRITE";

export interface ApiKeyResponse {
  id: string;
  name: string;
  scope: ApiKeyScope;
  createdAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface CreateApiKeyResult {
  key: string;
  apiKey: ApiKeyResponse;
}

export type AiProviderType = "CLAUDE" | "DEEPSEEK" | "CUSTOM";
export type AiTask = "TAG_SUGGESTION" | "PROPERTY_SUGGESTION" | "INGESTION" | "LINKING";
export type AiModelTier = "CHEAP" | "BALANCED" | "POWERFUL" | "UNKNOWN";

export interface AiModel {
  provider: AiProviderType;
  id: string;
  label: string;
  tier: AiModelTier;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

export interface AiProviderStatus {
  provider: AiProviderType;
  connected: boolean;
}

export interface AiTaskConfig {
  task: AiTask;
  provider: AiProviderType;
  model: string;
  enabled: boolean;
}

export interface AiSettings {
  providers: AiProviderStatus[];
  tasks: AiTaskConfig[];
  models: AiModel[];
}

export interface AiUsageRow {
  task: AiTask;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AiUsageResponse {
  byTask: AiUsageRow[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

export interface TagSuggestion {
  name: string;
  existing: boolean;
  reason: string;
}

export interface PropertySuggestion {
  name: string;
  type: PropertyType;
  value: string | null;
  reason: string;
}

export interface AiSuggestionResponse {
  tags: TagSuggestion[];
  properties: PropertySuggestion[];
}

export interface AskSource {
  index: number;
  nodeId: string;
  title: string;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
}

export interface PlannedProperty {
  name: string;
  type: PropertyType;
  value: string | null;
}

export interface PlannedPage {
  title: string;
  html: string;
  layout: PageLayout;
  tags: string[];
  properties: PlannedProperty[];
  linkTitles: string[];
}

/** AI-proposed rewrite of a page: new body plus the pages it now references inline. */
export interface EditResponse {
  html: string;
  linkedIds: string[];
}

export interface IngestionPlan {
  pages: PlannedPage[];
  /** Existing page the AI suggests as destination (already resolved by the backend). */
  suggestedParentTitle: string | null;
  suggestedParentId: string | null;
}

export interface IngestionResult {
  createdPages: number;
  createdLinks: number;
  pageIds: string[];
  importId: string;
}

export interface TrashItem {
  id: string;
  title: string;
  kind: NodeKind;
  deletedAt: string | null;
}
