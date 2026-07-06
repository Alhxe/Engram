import { clearSession, getToken } from "./auth";
import type {
  ApiKeyResponse,
  ApiKeyScope,
  AttachmentResponse,
  AuthResponse,
  BacklinkResponse,
  BreadcrumbItem,
  CreateApiKeyResult,
  CreateNodeRequest,
  LinkResponse,
  NodeKind,
  NodeResponse,
  NodeTreeItem,
  PageResponse,
  PropertyType,
  TagResponse,
  UpdateNodeRequest,
} from "./types";

// Dev: relative path proxied by Vite to the backend. Production (Cloudflare
// Pages): set VITE_API_BASE_URL to the backend's public URL.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Expired/invalid session: drop it and return to login.
    if (response.status === 401 && token && !path.startsWith("/auth/")) {
      clearSession();
      window.location.reload();
    }
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    register: (body: { username: string; email?: string; password: string }) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { username: string; password: string }) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () =>
      request<{ id: string; username: string; email: string | null; role: string }>("/auth/me"),
  },
  apiKeys: {
    list: () => request<ApiKeyResponse[]>("/api-keys"),
    create: (body: { name: string; scope?: ApiKeyScope; expiresInDays?: number | null }) =>
      request<CreateApiKeyResult>("/api-keys", { method: "POST", body: JSON.stringify(body) }),
    remove: (id: string) => request<void>(`/api-keys/${id}`, { method: "DELETE" }),
  },
  nodes: {
    list: (params: { parentId?: string; page?: number; size?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.parentId) query.set("parentId", params.parentId);
      query.set("page", String(params.page ?? 0));
      query.set("size", String(params.size ?? 50));
      return request<PageResponse<NodeResponse>>(`/nodes?${query.toString()}`);
    },
    children: (parentId?: string) => {
      const query = parentId ? `?parentId=${parentId}` : "";
      return request<NodeTreeItem[]>(`/nodes/children${query}`);
    },
    graph: () => request<import("./types").GlobalGraphItem[]>("/nodes/graph"),
    breadcrumb: (id: string) => request<BreadcrumbItem[]>(`/nodes/${id}/breadcrumb`),
    get: (id: string) => request<NodeResponse>(`/nodes/${id}`),
    create: (body: CreateNodeRequest) =>
      request<NodeResponse>("/nodes", { method: "POST", body: JSON.stringify(body) }),
    clip: (url: string, parentId?: string | null) =>
      request<NodeResponse>("/nodes/clip", { method: "POST", body: JSON.stringify({ url, parentId }) }),
    daily: (date: string) =>
      request<NodeResponse>("/nodes/daily", { method: "POST", body: JSON.stringify({ date }) }),
    importCsv: async (file: File, title?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      const token = getToken();
      const response = await fetch(`${BASE_URL}/nodes/import-csv`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!response.ok) {
        let message = response.statusText;
        try {
          message = (await response.json()).message ?? message;
        } catch {
          /* non-JSON */
        }
        throw new ApiError(response.status, message);
      }
      return response.json() as Promise<NodeResponse>;
    },
    history: (id: string) => request<import("./types").RevisionResponse[]>(`/nodes/${id}/history`),
    restoreRevision: (id: string, revisionId: string) =>
      request<NodeResponse>(`/nodes/${id}/history/${revisionId}/restore`, { method: "POST" }),
    update: (id: string, body: UpdateNodeRequest) =>
      request<NodeResponse>(`/nodes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    move: (id: string, parentId: string | null) =>
      request<NodeResponse>(`/nodes/${id}/move`, { method: "PUT", body: JSON.stringify({ parentId }) }),
    reorder: (orderedIds: string[]) =>
      request<void>(`/nodes/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds }) }),
    updatePosition: (id: string, body: { x: number; y: number; color: string | null }) =>
      request<NodeResponse>(`/nodes/${id}/position`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => request<void>(`/nodes/${id}`, { method: "DELETE" }),
    trash: () => request<import("./types").TrashItem[]>("/nodes/trash"),
    restore: (id: string) => request<void>(`/nodes/${id}/restore`, { method: "POST" }),
    purge: (id: string) => request<void>(`/nodes/${id}/purge`, { method: "DELETE" }),
    emptyTrash: () => request<void>("/nodes/trash", { method: "DELETE" }),
    backlinks: (id: string) => request<BacklinkResponse[]>(`/nodes/${id}/backlinks`),
    propertyBacklinks: (id: string) =>
      request<import("./types").PropertyBacklink[]>(`/nodes/${id}/property-backlinks`),
    merge: (id: string, into: string) =>
      request<NodeResponse>(`/nodes/${id}/merge?into=${into}`, { method: "POST" }),
    hygiene: () => request<import("./types").HygieneResponse>("/nodes/hygiene"),
    setSmartQuery: (id: string, query: import("./types").SmartQuery | null) =>
      request<NodeResponse>(`/nodes/${id}/smart-query`, { method: "PUT", body: JSON.stringify(query ?? {}) }),
    smartResults: (id: string) => request<NodeResponse[]>(`/nodes/${id}/smart-results`),
    favorites: () => request<NodeTreeItem[]>("/nodes/favorites"),
    setFavorite: (id: string, favorite: boolean) =>
      request<NodeResponse>(`/nodes/${id}/favorite`, { method: "PUT", body: JSON.stringify({ favorite }) }),
    setShared: (id: string, shared: boolean) =>
      request<NodeResponse>(`/nodes/${id}/share`, { method: "PUT", body: JSON.stringify({ shared }) }),
    publicPage: (token: string) =>
      request<{ title: string; content: string | null; updatedAt: string | null }>(`/public/${token}`),
    templates: () => request<NodeTreeItem[]>("/nodes/templates"),
    resurface: () => request<NodeTreeItem[]>("/nodes/resurface"),
    setSchema: (id: string, fields: import("./types").SchemaField[]) =>
      request<NodeResponse>(`/nodes/${id}/schema`, { method: "PUT", body: JSON.stringify(fields) }),
    views: (id: string) => request<import("./types").SavedView[]>(`/nodes/${id}/views`),
    createView: (id: string, body: Omit<import("./types").SavedView, "id">) =>
      request<import("./types").SavedView>(`/nodes/${id}/views`, { method: "POST", body: JSON.stringify(body) }),
    deleteView: (id: string, viewId: string) =>
      request<void>(`/nodes/${id}/views/${viewId}`, { method: "DELETE" }),
    setTemplate: (id: string, template: boolean) =>
      request<NodeResponse>(`/nodes/${id}/template`, { method: "PUT", body: JSON.stringify({ template }) }),
    instantiate: (id: string, parentId?: string) => {
      const query = parentId ? `?parentId=${parentId}` : "";
      return request<NodeResponse>(`/nodes/${id}/instantiate${query}`, { method: "POST" });
    },
    localGraph: (id: string) => request<import("./types").LocalGraphResponse>(`/nodes/${id}/graph`),
    unlinkedMentions: (id: string) =>
      request<import("./types").UnlinkedMention[]>(`/nodes/${id}/unlinked-mentions`),
    upsertProperty: (id: string, body: { name: string; type: PropertyType; value: string | null }) =>
      request<NodeResponse>(`/nodes/${id}/properties`, { method: "PUT", body: JSON.stringify(body) }),
    deleteProperty: (id: string, name: string) =>
      request<NodeResponse>(`/nodes/${id}/properties?name=${encodeURIComponent(name)}`, { method: "DELETE" }),
  },
  search: (body: {
    query?: string;
    page?: number;
    size?: number;
    parentId?: string | null;
    kinds?: NodeKind[];
    tags?: string[];
  }) => request<import("./types").SearchResponse>("/search", { method: "POST", body: JSON.stringify(body) }),
  tags: {
    list: () => request<TagResponse[]>("/tags"),
  },
  webhooks: {
    list: () => request<import("./types").WebhookResponse[]>("/webhooks"),
    create: (url: string) =>
      request<import("./types").WebhookResponse>("/webhooks", { method: "POST", body: JSON.stringify({ url }) }),
    remove: (id: string) => request<void>(`/webhooks/${id}`, { method: "DELETE" }),
  },
  backup: async () => {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/backup`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "engram-backup.zip";
    a.click();
    URL.revokeObjectURL(url);
  },
  ai: {
    settings: () => request<import("./types").AiSettings>("/ai/settings"),
    usage: () => request<import("./types").AiUsageResponse>("/ai/usage"),
    setCredential: (body: {
      provider: import("./types").AiProviderType;
      apiKey: string;
      baseUrl?: string | null;
    }) => request<void>("/ai/credential", { method: "PUT", body: JSON.stringify(body) }),
    deleteCredential: (provider: import("./types").AiProviderType) =>
      request<void>(`/ai/credential/${provider}`, { method: "DELETE" }),
    test: (provider: import("./types").AiProviderType) =>
      request<void>(`/ai/credential/${provider}/test`, { method: "POST" }),
    setTaskModel: (
      task: import("./types").AiTask,
      body: { provider: import("./types").AiProviderType; model: string; enabled: boolean },
    ) => request<void>(`/ai/tasks/${task}`, { method: "PUT", body: JSON.stringify(body) }),
    suggest: (nodeId: string) =>
      request<import("./types").AiSuggestionResponse>(`/ai/suggest/${nodeId}`, { method: "POST" }),
    ask: (question: string, scopeId?: string | null) =>
      request<import("./types").AskResponse>("/ai/ask", {
        method: "POST",
        body: JSON.stringify({ question, scopeId: scopeId ?? null }),
      }),
    summarize: (parentId: string) =>
      request<{ summary: string }>(`/ai/summarize/${parentId}`, { method: "POST" }),
    suggestLinks: (nodeId: string) =>
      request<import("./types").LinkSuggestion[]>(`/ai/suggest-links/${nodeId}`, { method: "POST" }),
    duplicates: (nodeId: string) =>
      request<import("./types").DuplicateSuggestion[]>(`/ai/duplicates/${nodeId}`, { method: "POST" }),
    fill: (body: { parentId: string; name: string; type: PropertyType; instruction: string }) =>
      request<{ filled: number; total: number }>("/ai/fill", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ingestPreview: async (file: File | null, text: string) => {
      const form = new FormData();
      if (file) form.append("file", file);
      if (text) form.append("text", text);
      const token = getToken();
      const response = await fetch(`${BASE_URL}/ai/ingest/preview`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!response.ok) {
        let message = response.statusText;
        try {
          message = (await response.json()).message ?? message;
        } catch {
          /* non-JSON */
        }
        throw new ApiError(response.status, message);
      }
      return response.json() as Promise<import("./types").IngestionPlan>;
    },
    ingestCommit: (body: { parentId: string | null; plan: import("./types").IngestionPlan }) =>
      request<import("./types").IngestionResult>("/ai/ingest/commit", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ingestUndo: (importId: string) =>
      request<void>(`/ai/ingest/undo/${importId}`, { method: "POST" }),
    edit: (nodeId: string, instruction: string) =>
      request<import("./types").EditResponse>(`/ai/edit/${nodeId}`, {
        method: "POST",
        body: JSON.stringify({ instruction }),
      }),
  },
  links: {
    list: () => request<LinkResponse[]>("/links"),
    create: (body: { sourceId: string; targetId: string; relType?: string | null }) =>
      request<LinkResponse>("/links", { method: "POST", body: JSON.stringify(body) }),
    setType: (id: string, relType: string | null) =>
      request<LinkResponse>(`/links/${id}/type`, { method: "PUT", body: JSON.stringify({ relType }) }),
    remove: (id: string) => request<void>(`/links/${id}`, { method: "DELETE" }),
  },
  attachments: {
    list: (nodeId: string) => request<AttachmentResponse[]>(`/nodes/${nodeId}/attachments`),
    upload: async (nodeId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const key = getToken();
      const response = await fetch(`${BASE_URL}/nodes/${nodeId}/attachments`, {
        method: "POST",
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        body: form,
      });
      if (!response.ok) throw new ApiError(response.status, response.statusText);
      return response.json() as Promise<AttachmentResponse>;
    },
    blobUrl: async (id: string) => {
      const key = getToken();
      const response = await fetch(`${BASE_URL}/attachments/${id}`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
      });
      if (!response.ok) throw new ApiError(response.status, response.statusText);
      return URL.createObjectURL(await response.blob());
    },
    remove: (id: string) => request<void>(`/attachments/${id}`, { method: "DELETE" }),
  },
};
