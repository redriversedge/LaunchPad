/**
 * Document Structure Mapper
 *
 * Walks every paragraph and run in a parsed OOXML document body,
 * recording text content, formatting, and position for surgical editing.
 */

import type { DocumentMap, MappedParagraph, MappedRun, RunFormat, ParagraphProps } from "./types";
import {
  getParagraphs,
  getRuns,
  getParaProps,
  getRunProps,
  getTextContent,
  getPropVal,
  isBoolProp,
  getElement,
  getAttr,
} from "./xml-utils";

/** Extract run-level formatting from w:rPr */
function extractRunFormat(run: Record<string, unknown>): RunFormat {
  const rPr = getRunProps(run);
  if (!rPr) return {};

  const format: RunFormat = {};

  // Font name
  const rFonts = getElement(rPr, "rFonts");
  if (rFonts) {
    format.fontName = getAttr(rFonts, "ascii") ?? getAttr(rFonts, "hAnsi") ?? getAttr(rFonts, "cs");
  }

  // Font size (in half-points)
  const sz = getPropVal(rPr, "sz");
  if (sz) format.fontSize = parseInt(sz, 10);

  // Boolean properties
  if (isBoolProp(rPr, "b")) format.bold = true;
  if (isBoolProp(rPr, "i")) format.italic = true;
  if (isBoolProp(rPr, "strike")) format.strike = true;
  if (isBoolProp(rPr, "smallCaps")) format.smallCaps = true;
  if (isBoolProp(rPr, "caps")) format.allCaps = true;

  // Underline
  const u = getPropVal(rPr, "u");
  if (u && u !== "none") format.underline = u;

  // Color
  const colorEl = getElement(rPr, "color");
  if (colorEl) {
    const colorVal = getAttr(colorEl, "val");
    if (colorVal && colorVal !== "auto") format.color = colorVal;
  }

  // Highlight
  const highlight = getPropVal(rPr, "highlight");
  if (highlight && highlight !== "none") format.highlight = highlight;

  // Vertical alignment (superscript/subscript)
  const vertAlign = getPropVal(rPr, "vertAlign");
  if (vertAlign) format.vertAlign = vertAlign;

  return format;
}

/** Extract paragraph-level properties from w:pPr */
function extractParagraphProps(para: Record<string, unknown>): ParagraphProps {
  const pPr = getParaProps(para);
  if (!pPr) return {};

  const props: ParagraphProps = {};

  // Style
  const pStyle = getPropVal(pPr, "pStyle");
  if (pStyle) props.styleName = pStyle;

  // Alignment
  const jc = getPropVal(pPr, "jc");
  if (jc) props.alignment = jc;

  // Numbering (lists)
  const numPr = getElement(pPr, "numPr");
  if (numPr) {
    const numId = getPropVal(numPr, "numId");
    if (numId) props.numId = numId;
    const ilvl = getPropVal(numPr, "ilvl");
    if (ilvl) props.numLevel = parseInt(ilvl, 10);
  }

  // Indentation
  const ind = getElement(pPr, "ind");
  if (ind) {
    const left = getAttr(ind, "left");
    if (left) props.indentLeft = parseInt(left, 10);
    const right = getAttr(ind, "right");
    if (right) props.indentRight = parseInt(right, 10);
    const firstLine = getAttr(ind, "firstLine");
    if (firstLine) props.indentFirstLine = parseInt(firstLine, 10);
  }

  // Spacing
  const spacing = getElement(pPr, "spacing");
  if (spacing) {
    const before = getAttr(spacing, "before");
    if (before) props.spaceBefore = parseInt(before, 10);
    const after = getAttr(spacing, "after");
    if (after) props.spaceAfter = parseInt(after, 10);
    const line = getAttr(spacing, "line");
    if (line) props.lineSpacing = parseInt(line, 10);
  }

  return props;
}

/**
 * Build a complete structural map of the document body.
 * Records every paragraph and run with text, formatting, and position.
 */
export function buildDocumentMap(body: Record<string, unknown>): DocumentMap {
  const paragraphs = getParagraphs(body);
  const mapped: MappedParagraph[] = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const para = paragraphs[pIdx];
    const runs = getRuns(para);
    const props = extractParagraphProps(para);

    const mappedRuns: MappedRun[] = [];
    let charOffset = 0;

    for (let rIdx = 0; rIdx < runs.length; rIdx++) {
      const run = runs[rIdx];
      const text = getTextContent(run);
      const format = extractRunFormat(run);

      mappedRuns.push({
        runIndex: rIdx,
        text,
        charOffset,
        charLength: text.length,
        format,
        xmlPath: `body.p[${pIdx}].r[${rIdx}]`,
      });

      charOffset += text.length;
    }

    const fullText = mappedRuns.map((r) => r.text).join("");

    mapped.push({
      paraIndex: pIdx,
      fullText,
      props,
      runs: mappedRuns,
    });
  }

  return {
    paragraphs: mapped,
    totalParagraphs: paragraphs.length,
    metadata: {},
  };
}

/**
 * Find which paragraph contains a given text string.
 * Returns all matches (paraIndex and position within paragraph text).
 */
export function findTextInDocument(
  docMap: DocumentMap,
  searchText: string
): Array<{ paraIndex: number; position: number }> {
  const results: Array<{ paraIndex: number; position: number }> = [];
  const normalized = normalizeWhitespace(searchText);

  for (const para of docMap.paragraphs) {
    const normalizedFull = normalizeWhitespace(para.fullText);
    let pos = normalizedFull.indexOf(normalized);
    while (pos !== -1) {
      results.push({ paraIndex: para.paraIndex, position: pos });
      pos = normalizedFull.indexOf(normalized, pos + 1);
    }
  }

  return results;
}

/** Normalize whitespace for fuzzy text matching */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Find which runs in a paragraph are affected by a text replacement
 * at a given character position and length.
 */
export function findAffectedRuns(
  para: MappedParagraph,
  startPos: number,
  length: number
): Array<{ runIndex: number; startInRun: number; endInRun: number }> {
  const endPos = startPos + length;
  const affected: Array<{ runIndex: number; startInRun: number; endInRun: number }> = [];

  for (const run of para.runs) {
    const runStart = run.charOffset;
    const runEnd = run.charOffset + run.charLength;

    // Check if this run overlaps with the replacement range
    if (runEnd > startPos && runStart < endPos) {
      const startInRun = Math.max(0, startPos - runStart);
      const endInRun = Math.min(run.charLength, endPos - runStart);
      affected.push({
        runIndex: run.runIndex,
        startInRun,
        endInRun,
      });
    }
  }

  return affected;
}
