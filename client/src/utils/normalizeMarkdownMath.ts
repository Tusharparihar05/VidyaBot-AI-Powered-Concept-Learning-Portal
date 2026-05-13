/**
 * LLMs often emit LaTeX commands without $...$ delimiters, so remark-math never sees them.
 * This pass wraps common bare-LaTeX patterns so KaTeX can render (tables, lists, body text).
 * Fenced ``` blocks are left untouched.
 */

function normalizeMathInPlainText(text: string): string {
  if (!text.includes('\\')) return text;

  let s = text;

  // Set notation { ... | ... } → wrap in $...$ and use \mid so '|' does not break GFM tables
  s = s.replace(/\{([^{}]*\\[a-zA-Z][^{}]*)\}/gi, (full, inner: string) => {
    const raw = inner.trim();
    if (raw.includes('$')) return full;
    let body = raw.includes('|') ? raw.replace(/\s*\|\s*/g, ' \\mid ') : raw;
    return `$${body}$`;
  });

  // Parenthesized LaTeX e.g. ( S \rightarrow aS ) or ( \alpha \rightarrow \beta )
  s = s.replace(/\(\s*([^()$]*\\[a-zA-Z][^()$]*)\s*\)/g, (full, inner: string) => {
    const raw = inner.trim();
    if (!raw || raw.includes('$')) return full;
    return `$${raw}$`;
  });

  return s;
}

export function normalizeMarkdownMath(markdown: string): string {
  if (!markdown || !markdown.includes('\\')) return markdown;

  const parts = markdown.split(/(```[\s\S]*?```)/);
  return parts.map((part) => (part.startsWith('```') ? part : normalizeMathInPlainText(part))).join('');
}
