/**
 * Low-level XML utilities for navigating OOXML document structure.
 * Handles the w: namespace prefix and common element access patterns.
 */

// OOXML namespace prefix
const W = "w:";

/** Get child elements by tag name, handling both prefixed and unprefixed */
export function getElements(parent: Record<string, unknown>, tagName: string): Record<string, unknown>[] {
  const key = `${W}${tagName}`;
  const val = parent[key];
  if (!val) return [];
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  return [val as Record<string, unknown>];
}

/** Get a single child element */
export function getElement(parent: Record<string, unknown>, tagName: string): Record<string, unknown> | null {
  const elements = getElements(parent, tagName);
  return elements[0] ?? null;
}

/** Get attribute value from an element's @_attr style */
export function getAttr(element: Record<string, unknown>, attrName: string): string | undefined {
  // fast-xml-parser stores attributes with @_ prefix
  const key = `@_${W}${attrName}`;
  const val = element[key];
  if (val !== undefined) return String(val);
  // Try without namespace
  const plainKey = `@_${attrName}`;
  const plainVal = element[plainKey];
  if (plainVal !== undefined) return String(plainVal);
  return undefined;
}

/** Get the val attribute from a simple property element like <w:b w:val="true"/> */
export function getPropVal(parent: Record<string, unknown>, propName: string): string | undefined {
  const el = getElement(parent, propName);
  if (!el) return undefined;
  // Some boolean props are present without val (means true)
  const val = getAttr(el, "val");
  if (val === undefined) return "true"; // presence = true for booleans
  return val;
}

/** Check if a boolean property is set (present and not "false"/"0") */
export function isBoolProp(parent: Record<string, unknown>, propName: string): boolean {
  const val = getPropVal(parent, propName);
  if (!val) return false;
  return val !== "false" && val !== "0";
}

/** Get text content from a w:t element */
export function getTextContent(run: Record<string, unknown>): string {
  const t = run[`${W}t`];
  if (t === undefined || t === null) return "";
  if (typeof t === "string") return t;
  if (typeof t === "number") return String(t);
  if (typeof t === "object" && t !== null) {
    // fast-xml-parser puts text in #text when attributes exist
    const obj = t as Record<string, unknown>;
    if (obj["#text"] !== undefined) return String(obj["#text"]);
    return "";
  }
  return String(t);
}

/** Set text content on a w:t element, preserving xml:space="preserve" */
export function setTextContent(run: Record<string, unknown>, text: string): void {
  const key = `${W}t`;
  const existing = run[key];

  if (existing !== null && typeof existing === "object" && existing !== undefined) {
    // Has attributes, update #text
    (existing as Record<string, unknown>)["#text"] = text;
  } else {
    // Simple string or missing - create object with space preserve
    run[key] = {
      "@_xml:space": "preserve",
      "#text": text,
    };
  }
}

/** Get the paragraph properties element */
export function getParaProps(para: Record<string, unknown>): Record<string, unknown> | null {
  return getElement(para, "pPr");
}

/** Get the run properties element */
export function getRunProps(run: Record<string, unknown>): Record<string, unknown> | null {
  return getElement(run, "rPr");
}

/** Get all runs from a paragraph */
export function getRuns(para: Record<string, unknown>): Record<string, unknown>[] {
  return getElements(para, "r");
}

/** Get all paragraphs from the document body */
export function getParagraphs(body: Record<string, unknown>): Record<string, unknown>[] {
  return getElements(body, "p");
}
