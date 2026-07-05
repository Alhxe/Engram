import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NodeResponse, PropertyType } from "@/lib/types";

export interface PropInit {
  name: string;
  type: PropertyType;
  value: string | null;
}

/** Shared write operations for the interactive collection views (table/board/calendar). */
export function useCollection(parentId: string, untitled: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["nodes"] });
    qc.invalidateQueries({ queryKey: ["children"] });
  };

  const setProperty = useMutation({
    mutationFn: (v: { nodeId: string; name: string; type: PropertyType; value: string | null }) =>
      api.nodes.upsertProperty(v.nodeId, { name: v.name, type: v.type, value: v.value }),
    onSuccess: invalidate,
  });

  const addRow = useMutation({
    mutationFn: async (v: { title?: string; props?: PropInit[] } = {}) => {
      const node = await api.nodes.create({ title: v.title?.trim() || untitled, parentId });
      for (const p of v.props ?? []) {
        await api.nodes.upsertProperty(node.id, p);
      }
      return node;
    },
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: (v: { node: NodeResponse; title: string }) =>
      api.nodes.update(v.node.id, {
        title: v.title.trim() || untitled,
        content: v.node.content,
        kind: v.node.kind,
        layout: v.node.layout,
        parentId: v.node.parentId,
        tags: v.node.tags,
      }),
    onSuccess: invalidate,
  });

  return { setProperty, addRow, rename, invalidate };
}
