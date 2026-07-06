import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { CreateNodeRequest, UpdateNodeRequest } from "./types";

export function useNodes(parentId?: string) {
  return useQuery({
    queryKey: ["nodes", { parentId: parentId ?? null }],
    queryFn: () => api.nodes.list({ parentId }),
  });
}

export function useNodeChildren(parentId?: string, enabled = true) {
  return useQuery({
    queryKey: ["children", parentId ?? "root"],
    queryFn: () => api.nodes.children(parentId),
    enabled,
  });
}

export function useBreadcrumb(id: string | undefined) {
  return useQuery({
    queryKey: ["breadcrumb", id],
    queryFn: () => api.nodes.breadcrumb(id as string),
    enabled: !!id,
  });
}

export function useUpsertProperty(nodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; type: import("./types").PropertyType; value: string | null }) =>
      api.nodes.upsertProperty(nodeId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["node", nodeId] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useDeleteProperty(nodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.nodes.deleteProperty(nodeId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["node", nodeId] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useNode(id: string | undefined) {
  return useQuery({
    queryKey: ["node", id],
    queryFn: () => api.nodes.get(id as string),
    enabled: !!id,
  });
}

export function useBacklinks(id: string | undefined) {
  return useQuery({
    queryKey: ["backlinks", id],
    queryFn: () => api.nodes.backlinks(id as string),
    enabled: !!id,
  });
}

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: () => api.tags.list() });
}

export function useFavorites() {
  return useQuery({ queryKey: ["favorites"], queryFn: () => api.nodes.favorites() });
}

export function useSetFavorite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (favorite: boolean) => api.nodes.setFavorite(id, favorite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["node", id] });
    },
  });
}

export function useLinks() {
  return useQuery({ queryKey: ["links"], queryFn: () => api.links.list() });
}

export function useGlobalGraph() {
  return useQuery({ queryKey: ["global-graph"], queryFn: () => api.nodes.graph() });
}

function invalidateTree(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["nodes"] });
  qc.invalidateQueries({ queryKey: ["children"] });
  qc.invalidateQueries({ queryKey: ["tags"] });
}

export function useCreateNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNodeRequest) => api.nodes.create(body),
    onSuccess: () => invalidateTree(qc),
  });
}

export function useUpdateNode(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateNodeRequest) => api.nodes.update(id, body),
    onSuccess: () => {
      invalidateTree(qc);
      qc.invalidateQueries({ queryKey: ["node", id] });
      qc.invalidateQueries({ queryKey: ["breadcrumb", id] });
    },
  });
}

export function useDeleteNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.nodes.remove(id),
    onSuccess: () => invalidateTree(qc),
  });
}

export function useMoveNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      api.nodes.move(id, parentId),
    onSuccess: () => invalidateTree(qc),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.links.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["links"] });
      qc.invalidateQueries({ queryKey: ["backlinks"] });
    },
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { sourceId: string; targetId: string }) => api.links.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["links"] });
      qc.invalidateQueries({ queryKey: ["backlinks"] });
    },
  });
}

export function useReorderNodes(parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.nodes.reorder(orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nodes", { parentId: parentId ?? null }] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, x, y, color }: { id: string; x: number; y: number; color: string | null }) =>
      api.nodes.updatePosition(id, { x, y, color }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nodes"] }),
  });
}

export function useSrsDue(scope?: string) {
  return useQuery({ queryKey: ["srs", "due", scope ?? null], queryFn: () => api.srs.due(scope) });
}

export function useSubjects() {
  return useQuery({ queryKey: ["academia", "subjects"], queryFn: () => api.academia.subjects() });
}

export function useSrsSummary() {
  return useQuery({ queryKey: ["srs", "summary"], queryFn: () => api.srs.summary() });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard() });
}

export function useInbox() {
  return useQuery({ queryKey: ["inbox"], queryFn: () => api.inbox() });
}

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: () => api.tasks() });
}

export function useSnippets() {
  return useQuery({ queryKey: ["snippets"], queryFn: () => api.snippets() });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.academia.createSubject(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academia", "subjects"] });
      qc.invalidateQueries({ queryKey: ["children"] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useSrsGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, grade }: { id: string; grade: "AGAIN" | "HARD" | "GOOD" | "EASY" }) =>
      api.srs.grade(id, grade),
    // Invalidate the card itself; the review queue is managed locally so the
    // session isn't disrupted mid-review.
    onSuccess: (_res, { id }) => qc.invalidateQueries({ queryKey: ["node", id] }),
  });
}

export function useGenerateFlashcards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, count = 6 }: { pageId: string; count?: number }) =>
      api.ai.flashcards(pageId, count),
    onSuccess: (_res, { pageId }) => {
      qc.invalidateQueries({ queryKey: ["nodes", { parentId: pageId }] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
      qc.invalidateQueries({ queryKey: ["children"] });
    },
  });
}

export function useAllNodes(size = 1000) {
  return useQuery({
    queryKey: ["nodes", "all", size],
    queryFn: () => api.nodes.list({ size }),
  });
}

export function useImportRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repo: string) => api.github.import(repo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["children"] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useSyncRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.github.sync(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ["node", id] });
      qc.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}
