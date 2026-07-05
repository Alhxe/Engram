/** Lightweight client-side export: page HTML → Markdown file, or a print/PDF view. */

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(title: string): string {
  return (title.trim() || "page").replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 80);
}

/** Convert the editor's HTML into reasonable Markdown (headings, lists, tables, links…). */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const inline = (node: Node): string =>
    Array.from(node.childNodes).map(render).join("");

  const render = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case "h1": return `\n# ${inline(el)}\n\n`;
      case "h2": return `\n## ${inline(el)}\n\n`;
      case "h3": return `\n### ${inline(el)}\n\n`;
      case "p": return `${inline(el)}\n\n`;
      case "br": return `\n`;
      case "strong": case "b": return `**${inline(el)}**`;
      case "em": case "i": return `*${inline(el)}*`;
      case "u": return `<u>${inline(el)}</u>`;
      case "s": case "del": return `~~${inline(el)}~~`;
      case "code": return `\`${el.textContent ?? ""}\``;
      case "pre": return `\n\`\`\`\n${el.textContent ?? ""}\n\`\`\`\n\n`;
      case "blockquote":
        return inline(el).trim().split("\n").map((l) => `> ${l}`).join("\n") + "\n\n";
      case "hr": return `\n---\n\n`;
      case "a": return `[${inline(el)}](${el.getAttribute("href") ?? ""})`;
      case "img": return `![${el.getAttribute("alt") ?? ""}](${el.getAttribute("src") ?? ""})`;
      case "ul":
        return Array.from(el.children).map((li) => `- ${inline(li).trim()}`).join("\n") + "\n\n";
      case "ol":
        return Array.from(el.children).map((li, i) => `${i + 1}. ${inline(li).trim()}`).join("\n") + "\n\n";
      case "li": return inline(el);
      case "table": return renderTable(el) + "\n";
      case "span": return el.className === "page-link" ? `[[${inline(el)}]]` : inline(el);
      default: return inline(el);
    }
  };

  const renderTable = (table: HTMLElement): string => {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length === 0) return "";
    const cells = (tr: Element) =>
      Array.from(tr.querySelectorAll("th,td")).map((c) => inline(c).trim().replace(/\|/g, "\\|"));
    const header = cells(rows[0]);
    const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
    rows.slice(1).forEach((tr) => lines.push(`| ${cells(tr).join(" | ")} |`));
    return lines.join("\n") + "\n";
  };

  return inline(doc.body).replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function exportMarkdown(title: string, html: string) {
  const md = `# ${title || "Untitled"}\n\n${htmlToMarkdown(html)}`;
  download(`${safeName(title)}.md`, md, "text/markdown");
}

/** Open a clean print view of the page — the browser's "Save as PDF" takes it from there. */
export function exportPdf(title: string, html: string) {
  const win = window.open("", "_blank", "noopener");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title || "Untitled"}</title>
  <style>
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 720px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.6; }
    h1,h2,h3 { line-height: 1.25; }
    img { max-width: 100%; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th,td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    pre { background: #f4f4f5; padding: 12px; border-radius: 8px; overflow-x: auto; }
    code { background: #f4f4f5; padding: 1px 4px; border-radius: 4px; }
    blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 12px; color: #555; }
    .page-link { color: #4f46e5; }
  </style></head><body><h1>${title || "Untitled"}</h1>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
