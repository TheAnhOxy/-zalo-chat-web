const ALLOWED_TAGS = new Set(["b", "i", "em", "strong", "br"]);

/** Strip HTML tags except a small allowlist; escape text nodes. */
export function sanitizeMessageHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  if (typeof window === "undefined") {
    return input.replace(/<[^>]*>/g, "");
  }

  const doc = new DOMParser().parseFromString(input, "text/html");
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join("");
    if (ALLOWED_TAGS.has(tag)) {
      if (tag === "br") return "<br />";
      return `<${tag}>${inner}</${tag}>`;
    }
    return inner;
  };

  return Array.from(doc.body.childNodes).map(walk).join("");
}

export function plainTextFromHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
}
