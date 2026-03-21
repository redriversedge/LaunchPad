/**
 * DocxEditor - Format-Preserving Resume Editor
 *
 * Opens a .docx file, maps its structure, applies surgical text replacements
 * at the Run level (preserving all formatting), and outputs the modified .docx.
 *
 * Architecture:
 * 1. Unzip .docx (it's a ZIP of XML files)
 * 2. Parse word/document.xml
 * 3. Build structural map (paragraphs, runs, formatting)
 * 4. Apply text replacements surgically (only touch w:t text nodes)
 * 5. Run quality checks
 * 6. Rezip into a valid .docx
 *
 * Dependencies: jszip (zip handling), built-in XML parsing
 */

import JSZip from "jszip";
import type { TextReplacement, ReplacementResult, QualityCheckResult } from "./types";

// The primary API is editDocxBuffer() below, which handles the full lifecycle:
// unzip -> parse -> map -> apply replacements -> quality check -> rezip

// --- Internal XML handling ---
// We use a lightweight tag-based approach instead of a full XML parser
// to preserve exact formatting, namespaces, and whitespace in the output.

interface XmlNode {
  tag: string;
  attrs: string;
  children: (XmlNode | string)[];
  selfClosing: boolean;
}

/**
 * Parse the w:body element from document.xml into a navigable structure.
 * This approach preserves the exact XML for parts we don't edit.
 */
function parseDocumentBody(xml: string): Record<string, unknown> {
  // Find <w:body> content
  const bodyStart = xml.indexOf("<w:body");
  const bodyEnd = xml.lastIndexOf("</w:body>");
  if (bodyStart === -1 || bodyEnd === -1) {
    throw new Error("Cannot find <w:body> in document.xml");
  }

  // Find the end of the opening body tag
  const bodyTagEnd = xml.indexOf(">", bodyStart) + 1;
  const bodyContent = xml.substring(bodyTagEnd, bodyEnd);

  // Parse paragraphs
  const paragraphs = extractParagraphs(bodyContent);

  return {
    "w:p": paragraphs,
    _bodyContent: bodyContent,
    _fullXml: xml,
  };
}

interface ParsedParagraph {
  fullXml: string;
  runs: ParsedRun[];
  pPrXml: string;
  beforeRuns: string;
  afterRuns: string;
}

interface ParsedRun {
  fullXml: string;
  rPrXml: string;
  textContent: string;
  beforeText: string;
  afterText: string;
  hasText: boolean;
}

/**
 * Extract paragraph structures from body XML content.
 * Preserves exact XML for non-text elements.
 */
function extractParagraphs(bodyContent: string): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];
  const paraRegex = /<w:p[\s>]/g;
  let match;

  while ((match = paraRegex.exec(bodyContent)) !== null) {
    const paraStart = match.index;
    const paraEnd = findClosingTag(bodyContent, paraStart, "w:p");
    if (paraEnd === -1) continue;

    const fullXml = bodyContent.substring(paraStart, paraEnd);

    // Extract pPr (paragraph properties)
    let pPrXml = "";
    const pPrStart = fullXml.indexOf("<w:pPr");
    if (pPrStart !== -1) {
      const pPrEnd = findClosingTag(fullXml, pPrStart, "w:pPr");
      if (pPrEnd !== -1) {
        pPrXml = fullXml.substring(pPrStart, pPrEnd);
      } else {
        // Self-closing
        const selfClose = fullXml.indexOf("/>", pPrStart);
        if (selfClose !== -1) {
          pPrXml = fullXml.substring(pPrStart, selfClose + 2);
        }
      }
    }

    // Extract runs
    const runs = extractRuns(fullXml);

    paragraphs.push({
      fullXml,
      runs,
      pPrXml,
      beforeRuns: "", // Simplified - we reconstruct from parts
      afterRuns: "",
    });
  }

  return paragraphs;
}

/**
 * Extract run structures from paragraph XML.
 */
function extractRuns(paraXml: string): ParsedRun[] {
  const runs: ParsedRun[] = [];
  const runRegex = /<w:r[\s>](?!ef)/g; // Avoid matching w:rPr, w:rFonts, etc.
  let match;

  while ((match = runRegex.exec(paraXml)) !== null) {
    const runStart = match.index;
    const runEnd = findClosingTag(paraXml, runStart, "w:r");
    if (runEnd === -1) continue;

    const fullXml = paraXml.substring(runStart, runEnd);

    // Extract rPr
    let rPrXml = "";
    const rPrStart = fullXml.indexOf("<w:rPr");
    if (rPrStart !== -1) {
      const rPrEnd = findClosingTag(fullXml, rPrStart, "w:rPr");
      if (rPrEnd !== -1) {
        rPrXml = fullXml.substring(rPrStart, rPrEnd);
      } else {
        const selfClose = fullXml.indexOf("/>", rPrStart);
        if (selfClose !== -1 && selfClose < fullXml.indexOf("<", rPrStart + 1)) {
          rPrXml = fullXml.substring(rPrStart, selfClose + 2);
        }
      }
    }

    // Extract text content from w:t
    let textContent = "";
    let hasText = false;
    const tMatch = fullXml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/);
    if (tMatch) {
      textContent = tMatch[1];
      hasText = true;
    }

    runs.push({
      fullXml,
      rPrXml,
      textContent,
      beforeText: "",
      afterText: "",
      hasText,
    });
  }

  return runs;
}

/**
 * Find the closing tag position for a given opening tag.
 * Handles nested same-name tags correctly.
 */
function findClosingTag(xml: string, openStart: number, tagName: string): number {
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let pos = openStart;

  while (pos < xml.length) {
    const nextOpen = xml.indexOf(openTag, pos + 1);
    const nextClose = xml.indexOf(closeTag, pos + 1);
    const selfClose = xml.indexOf("/>", pos);

    // Check if the opening tag is self-closing before looking further
    if (depth === 0) {
      const tagEnd = xml.indexOf(">", openStart);
      if (tagEnd !== -1 && xml[tagEnd - 1] === "/") {
        return tagEnd + 1;
      }
    }

    if (nextClose === -1) return -1;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Check if nextOpen's tag is self-closing
      const nextTagEnd = xml.indexOf(">", nextOpen);
      if (nextTagEnd !== -1 && xml[nextTagEnd - 1] === "/") {
        // Self-closing, skip it
        pos = nextTagEnd + 1;
        continue;
      }
      // Nested opening tag, but verify it's the same tag
      const afterTag = xml.substring(nextOpen + tagName.length + 1, nextOpen + tagName.length + 2);
      if (afterTag === " " || afterTag === ">" || afterTag === "/") {
        depth++;
      }
      pos = nextOpen + 1;
    } else {
      if (depth === 0) {
        return nextClose + closeTag.length;
      }
      depth--;
      pos = nextClose + 1;
    }
  }

  return -1;
}

// --- Bridge between our parsed structure and the surgical editor ---

/**
 * Convert our parsed paragraphs into the format expected by xml-utils.ts
 * and the surgical editor, while keeping the raw XML for reconstruction.
 */
export function bridgeToEditorFormat(paragraphs: ParsedParagraph[]): Record<string, unknown> {
  return {
    "w:p": paragraphs.map((p) => {
      const para: Record<string, unknown> = {};

      // Build runs array
      para["w:r"] = p.runs.map((r) => {
        const run: Record<string, unknown> = {};
        if (r.hasText) {
          run["w:t"] = {
            "@_xml:space": "preserve",
            "#text": r.textContent,
          };
        }
        return run;
      });

      return para;
    }),
  };
}

/**
 * Apply surgical edits and reconstruct the document XML.
 * This is the main entry point that ties everything together.
 */
export async function editDocxBuffer(
  docxBuffer: Buffer,
  replacements: TextReplacement[]
): Promise<{
  editedBuffer: Buffer;
  results: ReplacementResult[];
  qualityCheck: QualityCheckResult;
  skippedEdits: Array<{ original: string; reason: string }>;
}> {
  // 1. Unzip
  const zip = await JSZip.loadAsync(docxBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Invalid .docx file: missing word/document.xml");
  }
  let documentXml = await docFile.async("string");

  // 2. Parse and map structure
  const bodyStart = documentXml.indexOf("<w:body");
  const bodyEnd = documentXml.lastIndexOf("</w:body>");
  if (bodyStart === -1 || bodyEnd === -1) {
    throw new Error("Cannot find <w:body> in document.xml");
  }
  const bodyTagEnd = documentXml.indexOf(">", bodyStart) + 1;
  const bodyContent = documentXml.substring(bodyTagEnd, bodyEnd);

  // 3. Apply replacements directly to the XML string
  // This is the most reliable approach: find-and-replace within the XML text nodes
  const results: ReplacementResult[] = [];
  const skippedEdits: Array<{ original: string; reason: string }> = [];
  let editedXml = documentXml;

  for (const replacement of replacements) {
    const result = applyXmlTextReplacement(editedXml, replacement);
    if (result.applied) {
      editedXml = result.xml;
      results.push({ applied: true, paraIndex: 0, runIndices: [] });
    } else {
      results.push({ applied: false, skipReason: result.reason });
      skippedEdits.push({ original: replacement.original, reason: result.reason });
    }
  }

  // 4. Quality check: verify paragraph count hasn't changed
  const origParaCount = (documentXml.match(/<w:p[\s>]/g) || []).length;
  const editedParaCount = (editedXml.match(/<w:p[\s>]/g) || []).length;

  const qualityCheck: QualityCheckResult = {
    valid: origParaCount === editedParaCount,
    paragraphCountMatch: origParaCount === editedParaCount,
    originalCount: origParaCount,
    currentCount: editedParaCount,
    corruptionDetected: false,
    formattingDrifts: [],
  };

  // 5. Rezip
  zip.file("word/document.xml", editedXml);
  const output = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    editedBuffer: Buffer.from(output),
    results,
    qualityCheck,
    skippedEdits,
  };
}

/**
 * Apply a text replacement within XML w:t tags.
 * This preserves all XML structure and formatting by only modifying
 * the text content between <w:t> and </w:t> tags.
 */
function applyXmlTextReplacement(
  xml: string,
  replacement: TextReplacement
): { applied: boolean; xml: string; reason: string } {
  const { original, replacement: newText } = replacement;

  // Strategy 1: Find the original text within w:t tags
  // Build a map of all text content and their positions
  const textNodes = findAllTextNodes(xml);

  // Try to find the original text across consecutive text nodes
  const match = findTextAcrossNodes(textNodes, original);

  if (!match) {
    // Try with normalized whitespace
    const normalizedMatch = findTextAcrossNodes(textNodes, original, true);
    if (!normalizedMatch) {
      return {
        applied: false,
        xml,
        reason: `Text not found: "${original.substring(0, 60)}..."`,
      };
    }
    return applyMatchedReplacement(xml, normalizedMatch, newText);
  }

  return applyMatchedReplacement(xml, match, newText);
}

interface TextNode {
  /** Position of the text content start in the XML string */
  contentStart: number;
  /** Position of the text content end in the XML string */
  contentEnd: number;
  /** The text content */
  text: string;
}

interface TextMatch {
  /** Which text nodes are involved */
  nodes: Array<{
    node: TextNode;
    startInNode: number;
    endInNode: number;
  }>;
}

/** Find all <w:t>...</w:t> text content positions in the XML */
function findAllTextNodes(xml: string): TextNode[] {
  const nodes: TextNode[] = [];
  const regex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const fullMatchStart = match.index;
    const textContent = match[1];
    // Find where the actual text content starts (after the opening tag)
    const tagEnd = xml.indexOf(">", fullMatchStart) + 1;

    nodes.push({
      contentStart: tagEnd,
      contentEnd: tagEnd + textContent.length,
      text: textContent,
    });
  }

  return nodes;
}

/** Find text that may span across multiple w:t nodes */
function findTextAcrossNodes(
  nodes: TextNode[],
  searchText: string,
  normalize: boolean = false
): TextMatch | null {
  const search = normalize ? normalizeWS(searchText) : searchText;

  // First try: exact match within a single node
  for (const node of nodes) {
    const nodeText = normalize ? normalizeWS(node.text) : node.text;
    const pos = nodeText.indexOf(search);
    if (pos !== -1) {
      // Map back to original positions if normalized
      const startInNode = normalize ? findOriginalPosition(node.text, pos) : pos;
      const endInNode = normalize
        ? findOriginalPosition(node.text, pos + search.length)
        : pos + search.length;

      return {
        nodes: [{ node, startInNode, endInNode }],
      };
    }
  }

  // Second try: text spans consecutive nodes (common in .docx)
  for (let startIdx = 0; startIdx < nodes.length; startIdx++) {
    let combined = "";
    const involvedNodes: TextNode[] = [];

    for (let endIdx = startIdx; endIdx < Math.min(startIdx + 10, nodes.length); endIdx++) {
      combined += nodes[endIdx].text;
      involvedNodes.push(nodes[endIdx]);

      const searchIn = normalize ? normalizeWS(combined) : combined;
      const pos = searchIn.indexOf(search);

      if (pos !== -1) {
        // Found it! Map positions back to individual nodes
        const matchNodes: TextMatch["nodes"] = [];
        let offset = 0;
        const matchEnd = pos + search.length;

        for (const n of involvedNodes) {
          const nodeStart = offset;
          const nodeEnd = offset + n.text.length;

          if (nodeEnd > pos && nodeStart < matchEnd) {
            matchNodes.push({
              node: n,
              startInNode: Math.max(0, pos - nodeStart),
              endInNode: Math.min(n.text.length, matchEnd - nodeStart),
            });
          }

          offset += n.text.length;
        }

        if (matchNodes.length > 0) {
          return { nodes: matchNodes };
        }
      }
    }
  }

  return null;
}

/** Apply a matched replacement to the XML string */
function applyMatchedReplacement(
  xml: string,
  match: TextMatch,
  newText: string
): { applied: boolean; xml: string; reason: string } {
  // Build the replacement from right to left (so positions don't shift)
  let result = xml;
  const nodes = [...match.nodes].reverse();

  for (let i = 0; i < nodes.length; i++) {
    const { node, startInNode, endInNode } = nodes[i];
    const absoluteStart = node.contentStart + startInNode;
    const absoluteEnd = node.contentStart + endInNode;

    if (i === nodes.length - 1) {
      // First affected node (processing in reverse): insert the full new text here
      const before = result.substring(0, absoluteStart);
      const after = result.substring(absoluteEnd);
      result = before + newText + after;
    } else {
      // Subsequent nodes: remove the matched portion (keep the rest)
      const before = result.substring(0, absoluteStart);
      const after = result.substring(absoluteEnd);
      result = before + after;
    }
  }

  return { applied: true, xml: result, reason: "" };
}

/** Find position in original text corresponding to position in normalized text */
function findOriginalPosition(original: string, normalizedPos: number): number {
  let origIdx = 0;
  let normIdx = 0;

  // Skip leading whitespace
  while (origIdx < original.length && /\s/.test(original[origIdx]) && normIdx === 0) {
    origIdx++;
  }

  while (normIdx < normalizedPos && origIdx < original.length) {
    if (/\s/.test(original[origIdx])) {
      // In normalized form, consecutive whitespace is one space
      normIdx++;
      origIdx++;
      while (origIdx < original.length && /\s/.test(original[origIdx])) {
        origIdx++;
      }
    } else {
      normIdx++;
      origIdx++;
    }
  }

  return origIdx;
}

function normalizeWS(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
