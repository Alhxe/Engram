/**
 * Light Markdown → HTML for AI text (answers, summaries): bold/italic/code,
 * bullet lines, citation chips, and line breaks. LaTeX delimiters are stripped
 * (we don't render math, but the text stays clean).
 */
export function formatMarkdown(raw: string): string {
  let s = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\\[()[\]]/g, "").replace(/\\,/g, " "); // \( \) \[ \] \,
  s = s.replace(/^\s*[-*]\s+/gm, "• "); // bullet lines
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[(\d+)\]/g, '<sup class="ask-cite">$1</sup>');
  s = s.replace(/\n/g, "<br>");
  return s;
}
