/**
 * Quality Checker
 *
 * Verifies document integrity after surgical edits.
 * Checks for corruption, paragraph count changes, and formatting drift.
 */

import type { DocumentMap, QualityCheckResult, RunFormat } from "./types";
import { buildDocumentMap } from "./structure-mapper";

/**
 * Run quality checks on the edited document.
 * Compares against the pre-edit structural map.
 */
export function runQualityChecks(
  originalMap: DocumentMap,
  editedBody: Record<string, unknown>,
  intentionalParagraphChanges: number = 0
): QualityCheckResult {
  let editedMap: DocumentMap;
  try {
    editedMap = buildDocumentMap(editedBody);
  } catch {
    return {
      valid: false,
      paragraphCountMatch: false,
      originalCount: originalMap.totalParagraphs,
      currentCount: -1,
      corruptionDetected: true,
      formattingDrifts: [],
    };
  }

  const expectedCount = originalMap.totalParagraphs + intentionalParagraphChanges;
  const paragraphCountMatch = editedMap.totalParagraphs === expectedCount;

  // Check formatting drift on paragraphs that were edited
  const formattingDrifts: QualityCheckResult["formattingDrifts"] = [];

  for (const origPara of originalMap.paragraphs) {
    const editedPara = editedMap.paragraphs.find((p) => p.paraIndex === origPara.paraIndex);
    if (!editedPara) continue;

    // Only check runs that exist in both versions
    const minRuns = Math.min(origPara.runs.length, editedPara.runs.length);
    for (let rIdx = 0; rIdx < minRuns; rIdx++) {
      const origRun = origPara.runs[rIdx];
      const editedRun = editedPara.runs[rIdx];

      // Compare formatting fields
      const drifts = compareRunFormats(origRun.format, editedRun.format, origPara.paraIndex, rIdx);
      formattingDrifts.push(...drifts);
    }
  }

  return {
    valid: !formattingDrifts.some((d) => d.field !== "text") && paragraphCountMatch,
    paragraphCountMatch,
    originalCount: originalMap.totalParagraphs,
    currentCount: editedMap.totalParagraphs,
    corruptionDetected: false,
    formattingDrifts,
  };
}

/** Compare two RunFormat objects and return any differences */
function compareRunFormats(
  original: RunFormat,
  edited: RunFormat,
  paraIndex: number,
  runIndex: number
): QualityCheckResult["formattingDrifts"] {
  const drifts: QualityCheckResult["formattingDrifts"] = [];
  const fields: (keyof RunFormat)[] = [
    "fontName", "fontSize", "bold", "italic", "underline",
    "strike", "color", "highlight", "vertAlign", "smallCaps", "allCaps",
  ];

  for (const field of fields) {
    const origVal = String(original[field] ?? "");
    const editVal = String(edited[field] ?? "");
    if (origVal !== editVal) {
      drifts.push({
        paraIndex,
        runIndex,
        field,
        expected: origVal,
        actual: editVal,
      });
    }
  }

  return drifts;
}
