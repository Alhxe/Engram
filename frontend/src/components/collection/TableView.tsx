import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import type { NodeResponse, PropertyDto, PropertyType } from "@/lib/types";
import { useI18n } from "@/i18n/I18nContext";
import { useCollection } from "./useCollection";
import { PropertyValueInput } from "../PropertyValue";
import { LayoutIcon } from "../ui";

export interface Column {
  name: string;
  type: PropertyType;
  options?: string[] | null;
}

const TYPES: PropertyType[] = ["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX"];

function NameCell({
  node,
  untitled,
  onRename,
}: {
  node: NodeResponse;
  untitled: string;
  onRename: (title: string) => void;
}) {
  const [value, setValue] = useState(node.title);
  return (
    <div className="flex items-center gap-2">
      <LayoutIcon layout={node.layout} className="shrink-0 text-dim" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== node.title && onRename(value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder={untitled}
        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-medium text-ink outline-none transition hover:border-line2 focus:border-accent/60 focus:bg-card"
      />
      <Link
        to={`/nodes/${node.id}`}
        className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-dim opacity-0 transition hover:bg-elev hover:text-accent2 group-hover:opacity-100"
      >
        ↗
      </Link>
    </div>
  );
}

export default function TableView({
  children,
  derivedColumns,
  parentId,
  untitled,
  filter,
  onFilter,
  sortCol,
  sortDir,
  onSort,
}: {
  children: NodeResponse[];
  derivedColumns: Column[];
  parentId: string;
  untitled: string;
  filter: string;
  onFilter: (v: string) => void;
  sortCol: string;
  sortDir: 1 | -1;
  onSort: (col: string) => void;
}) {
  const { t } = useI18n();
  const { setProperty, addRow, rename } = useCollection(parentId, untitled);
  const [extra, setExtra] = useState<Column[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PropertyType>("TEXT");
  const sort = sortCol ? { col: sortCol, dir: sortDir } : null;

  const columns = useMemo(() => {
    const seen = new Map<string, Column>();
    [...derivedColumns, ...extra].forEach((c) => {
      if (!seen.has(c.name)) seen.set(c.name, c);
    });
    return [...seen.values()];
  }, [derivedColumns, extra]);

  const valueOf = (node: NodeResponse, col: string) =>
    col === "__name__" ? node.title : (node.properties.find((p) => p.name === col)?.value ?? "");

  const rows = useMemo(() => {
    let r = children;
    const q = filter.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          n.properties.some((p) => (p.value ?? "").toLowerCase().includes(q)),
      );
    }
    if (sort) {
      r = [...r].sort((a, b) => {
        const av = valueOf(a, sort.col) || "";
        const bv = valueOf(b, sort.col) || "";
        const an = Number(av);
        const bn = Number(bv);
        const cmp =
          av !== "" && bv !== "" && !Number.isNaN(an) && !Number.isNaN(bn)
            ? an - bn
            : av.localeCompare(bv);
        return cmp * sort.dir;
      });
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, filter, sort]);

  const sortMark = (col: string) => (sort?.col === col ? (sort.dir === 1 ? " ↑" : " ↓") : "");

  const cellFor = (node: NodeResponse, column: Column): PropertyDto =>
    node.properties.find((p) => p.name === column.name) ?? {
      name: column.name,
      type: column.type,
      value: null,
    };

  const submitColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (name && !columns.some((c) => c.name === name)) setExtra((c) => [...c, { name, type: newType }]);
    setNewName("");
    setNewType("TEXT");
    setAdding(false);
  };

  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <input
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          placeholder={t("table.filter")}
          className="w-full max-w-xs rounded-lg border border-line2 bg-card px-2.5 py-1 text-[13px] text-ink outline-none placeholder:text-dim focus:border-accent/60"
        />
        <span className="ml-auto text-xs text-dim">{rows.length}</span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-card text-left text-[11px] uppercase tracking-[0.08em] text-dim">
            <th className="min-w-[16rem] px-3.5 py-2 font-semibold">
              <button onClick={() => onSort("__name__")} className="uppercase tracking-[0.08em] hover:text-ink">
                {t("view.colName")}{sortMark("__name__")}
              </button>
            </th>
            {columns.map((c) => (
              <th key={c.name} className="min-w-[9rem] px-3.5 py-2 font-semibold">
                <button onClick={() => onSort(c.name)} className="uppercase tracking-[0.08em] hover:text-ink">
                  {c.name}{sortMark(c.name)}
                </button>
              </th>
            ))}
            <th className="w-12 px-2 py-2 text-right">
              {adding ? (
                <button onClick={() => setAdding(false)} className="text-dim hover:text-ink" title={t("common.close")}>
                  <X className="ml-auto h-4 w-4" strokeWidth={2} />
                </button>
              ) : (
                <button onClick={() => setAdding(true)} className="text-dim hover:text-ink" title={t("table.addColumn")}>
                  <Plus className="ml-auto h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </th>
          </tr>
          {adding && (
            <tr className="border-b border-line bg-panel">
              <td colSpan={columns.length + 2} className="px-3.5 py-2">
                <form onSubmit={submitColumn} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("table.columnName")}
                    className="w-48 rounded-md border border-line2 bg-card px-2 py-1 text-[13px] text-ink outline-none focus:border-accent/60"
                  />
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as PropertyType)}
                    className="rounded-md border border-line2 bg-card px-2 py-1 text-[13px] text-mid outline-none"
                  >
                    {TYPES.map((type) => (
                      <option key={type} value={type}>{t(`ptype.${type}`)}</option>
                    ))}
                  </select>
                  <button type="submit" className="flex items-center gap-1 text-[13px] font-medium text-accent2 hover:underline">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} /> {t("common.add")}
                  </button>
                </form>
              </td>
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((node) => (
            <tr key={node.id} className="group border-b border-line last:border-0 transition hover:bg-card/50">
              <td className="px-3.5 py-1.5">
                <NameCell node={node} untitled={untitled} onRename={(title) => rename.mutate({ node, title })} />
              </td>
              {columns.map((c) => (
                <td key={c.name} className="px-2 py-1.5">
                  <PropertyValueInput
                    property={cellFor(node, c)}
                    options={c.options}
                    onChange={(value) =>
                      setProperty.mutate({ nodeId: node.id, name: c.name, type: c.type, value })
                    }
                  />
                </td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button
        onClick={() => addRow.mutate({})}
        disabled={addRow.isPending}
        className="flex w-full items-center gap-1.5 border-t border-line px-3.5 py-2 text-left text-[13px] text-dim transition hover:bg-card hover:text-mid disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {t("table.addRow")}
      </button>
    </div>
  );
}
