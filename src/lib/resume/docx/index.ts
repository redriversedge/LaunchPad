/**
 * Format-Preserving DOCX Editor
 *
 * Surgically edits resume text at the XML run level without destroying
 * fonts, spacing, margins, bullet styles, headers, footers, or column layouts.
 *
 * Usage:
 *   import { editDocxBuffer } from "@/lib/resume/docx";
 *   const { editedBuffer, results, qualityCheck, skippedEdits } = await editDocxBuffer(
 *     originalDocxBuffer,
 *     [{ original: "old text", replacement: "new text", reason: "...", section: "summary" }]
 *   );
 */

export { editDocxBuffer } from "./editor";
export type {
  TextReplacement,
  ReplacementResult,
  QualityCheckResult,
  DocumentMap,
  MappedParagraph,
  MappedRun,
  RunFormat,
} from "./types";
