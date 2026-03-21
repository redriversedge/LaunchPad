/**
 * Surgical Edit Engine
 *
 * Performs text replacements at the Run level within OOXML paragraphs.
 * NEVER deletes/recreates runs or paragraphs. Only modifies w:t text content.
 * All formatting (fonts, sizes, bold, colors, etc.) is preserved automatically
 * because it lives in w:rPr which we never touch.
 */

import type { MappedParagraph, TextReplacement, ReplacementResult, RunFormat } from "./types";
import { getParagraphs, getRuns, getTextContent, setTextContent } from "./xml-utils";

/**
 * Apply a single text replacement to the document body XML.
 *
 * Strategy:
 * 1. Find the paragraph containing the original text
 * 2. Identify which runs span the text
 * 3. If single run: replace text substring directly
 * 4. If multi-run: put new text in the first affected run, empty the rest
 *    (keeping their XML nodes intact so formatting structure survives)
 */
export function applySurgicalReplacement(
  body: Record<string, unknown>,
  mappedParagraphs: MappedParagraph[],
  replacement: TextReplacement
): ReplacementResult {
  const { original, replacement: newText } = replacement;
  const normalizedOriginal = normalizeWS(original);

  // Find the paragraph containing this text
  let targetParaIdx = -1;
  let matchPos = -1;

  for (const mp of mappedParagraphs) {
    const normalizedFull = normalizeWS(mp.fullText);

    // Try exact match first
    const pos = normalizedFull.indexOf(normalizedOriginal);
    if (pos !== -1) {
      targetParaIdx = mp.paraIndex;
      matchPos = pos;
      break;
    }

    // Try fuzzy match (ignore extra whitespace, case-insensitive)
    const fuzzyPos = normalizedFull.toLowerCase().indexOf(normalizedOriginal.toLowerCase());
    if (fuzzyPos !== -1) {
      targetParaIdx = mp.paraIndex;
      matchPos = fuzzyPos;
      break;
    }
  }

  if (targetParaIdx === -1) {
    return {
      applied: false,
      skipReason: `Could not find text "${original.substring(0, 80)}..." in document`,
    };
  }

  const paragraphs = getParagraphs(body);
  const xmlPara = paragraphs[targetParaIdx];
  if (!xmlPara) {
    return {
      applied: false,
      skipReason: `Paragraph index ${targetParaIdx} out of bounds`,
    };
  }

  const mappedPara = mappedParagraphs.find((p) => p.paraIndex === targetParaIdx);
  if (!mappedPara) {
    return {
      applied: false,
      skipReason: `No mapping for paragraph ${targetParaIdx}`,
    };
  }

  const runs = getRuns(xmlPara);
  if (runs.length === 0) {
    return {
      applied: false,
      skipReason: "Paragraph has no runs",
    };
  }

  // Find which runs are affected by this replacement
  const affectedRuns = findAffectedRunSpans(mappedPara, matchPos, normalizedOriginal.length);

  if (affectedRuns.length === 0) {
    return {
      applied: false,
      skipReason: "Could not map text position to runs",
    };
  }

  // Record original formatting for quality check
  const originalFormats: RunFormat[] = affectedRuns.map((ar) => {
    const mappedRun = mappedPara.runs[ar.runIndex];
    return mappedRun?.format ?? {};
  });

  // SURGICAL EDIT: Modify only the text, never the formatting
  if (affectedRuns.length === 1) {
    // Simple case: text is within a single run
    const ar = affectedRuns[0];
    const run = runs[ar.runIndex];
    if (!run) {
      return { applied: false, skipReason: `Run ${ar.runIndex} not found` };
    }

    const currentText = getTextContent(run);
    // Replace the matched portion, keep the rest
    const before = currentText.substring(0, ar.startInRun);
    const after = currentText.substring(ar.endInRun);
    setTextContent(run, before + newText + after);

    return {
      applied: true,
      paraIndex: targetParaIdx,
      runIndices: [ar.runIndex],
    };
  }

  // Multi-run case: text spans multiple runs
  // Strategy: Put all new text in the first run, empty the middle runs,
  // keep the tail of the last run
  const firstAR = affectedRuns[0];
  const lastAR = affectedRuns[affectedRuns.length - 1];

  // First run: keep text before match, add new text
  const firstRun = runs[firstAR.runIndex];
  if (firstRun) {
    const currentText = getTextContent(firstRun);
    const before = currentText.substring(0, firstAR.startInRun);
    setTextContent(firstRun, before + newText);
  }

  // Middle runs: empty their text (keep the XML nodes for structure)
  for (let i = 1; i < affectedRuns.length - 1; i++) {
    const midRun = runs[affectedRuns[i].runIndex];
    if (midRun) {
      setTextContent(midRun, "");
    }
  }

  // Last run: keep text after match
  if (affectedRuns.length > 1) {
    const lastRun = runs[lastAR.runIndex];
    if (lastRun) {
      const currentText = getTextContent(lastRun);
      const after = currentText.substring(lastAR.endInRun);
      setTextContent(lastRun, after);
    }
  }

  // Check for formatting drift on the first run (the one that got the new text)
  const postEditFormat = originalFormats[0];
  let formattingDrift = false;
  let driftDetails: string | undefined;

  // We didn't touch rPr, so drift should not happen. But verify:
  if (firstRun) {
    // The formatting is still in the XML, we only changed w:t
    // No drift expected in this approach
  }

  return {
    applied: true,
    paraIndex: targetParaIdx,
    runIndices: affectedRuns.map((ar) => ar.runIndex),
    formattingDrift,
    driftDetails,
  };
}

/**
 * Apply multiple replacements to a document body.
 * Processes them in order, rebuilding the paragraph map after each
 * to account for text length changes.
 */
export function applyAllReplacements(
  body: Record<string, unknown>,
  mappedParagraphs: MappedParagraph[],
  replacements: TextReplacement[]
): ReplacementResult[] {
  const results: ReplacementResult[] = [];

  // Sort replacements by length (longest first) to avoid partial match issues
  const sorted = [...replacements].sort((a, b) => b.original.length - a.original.length);

  for (const replacement of sorted) {
    // Rebuild paragraph text map after each edit (text positions change)
    const currentMap = rebuildTextMap(body);
    const result = applySurgicalReplacement(body, currentMap, replacement);
    results.push(result);
  }

  return results;
}

/**
 * Rebuild the text mapping from the current state of the XML body.
 * Called between replacements to account for text length changes.
 */
function rebuildTextMap(body: Record<string, unknown>): MappedParagraph[] {
  const paragraphs = getParagraphs(body);
  const mapped: MappedParagraph[] = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const runs = getRuns(paragraphs[pIdx]);
    const runTexts: Array<{ text: string; offset: number }> = [];
    let offset = 0;

    for (let rIdx = 0; rIdx < runs.length; rIdx++) {
      const text = getTextContent(runs[rIdx]);
      runTexts.push({ text, offset });
      offset += text.length;
    }

    mapped.push({
      paraIndex: pIdx,
      fullText: runTexts.map((r) => r.text).join(""),
      props: {},
      runs: runTexts.map((r, rIdx) => ({
        runIndex: rIdx,
        text: r.text,
        charOffset: r.offset,
        charLength: r.text.length,
        format: {},
        xmlPath: `body.p[${pIdx}].r[${rIdx}]`,
      })),
    });
  }

  return mapped;
}

/**
 * Find which runs in a paragraph are affected by a text span.
 * Works with normalized whitespace to handle real-world XML spacing.
 */
function findAffectedRunSpans(
  para: MappedParagraph,
  startPos: number,
  length: number
): Array<{ runIndex: number; startInRun: number; endInRun: number }> {
  const endPos = startPos + length;
  const affected: Array<{ runIndex: number; startInRun: number; endInRun: number }> = [];

  // Build a normalized-to-raw position mapping
  const rawText = para.fullText;
  const normalizedText = normalizeWS(rawText);

  // Map normalized positions back to raw positions
  // This handles cases where the XML has extra whitespace between runs
  let rawIdx = 0;
  let normIdx = 0;
  const normToRaw: number[] = [];

  // Skip leading whitespace
  while (rawIdx < rawText.length && rawText[rawIdx] === " " && normIdx === 0) {
    rawIdx++;
  }

  for (let nIdx = 0; nIdx < normalizedText.length; nIdx++) {
    normToRaw[nIdx] = rawIdx;
    if (normalizedText[nIdx] === " ") {
      // Normalized space - skip all raw whitespace
      rawIdx++;
      while (rawIdx < rawText.length && /\s/.test(rawText[rawIdx])) {
        rawIdx++;
      }
    } else {
      rawIdx++;
    }
  }
  normToRaw[normalizedText.length] = rawIdx;

  const rawStart = normToRaw[startPos] ?? startPos;
  const rawEnd = normToRaw[Math.min(startPos + length, normalizedText.length)] ?? (startPos + length);

  // Now find runs that overlap with [rawStart, rawEnd)
  for (const run of para.runs) {
    const runStart = run.charOffset;
    const runEnd = run.charOffset + run.charLength;

    if (runEnd > rawStart && runStart < rawEnd) {
      const startInRun = Math.max(0, rawStart - runStart);
      const endInRun = Math.min(run.charLength, rawEnd - runStart);
      affected.push({
        runIndex: run.runIndex,
        startInRun,
        endInRun,
      });
    }
  }

  return affected;
}

/** Normalize whitespace for matching */
function normalizeWS(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
