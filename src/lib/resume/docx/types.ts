/**
 * Types for the format-preserving DOCX editor.
 * Maps the internal XML structure of .docx files at the paragraph and run level.
 */

/** Formatting properties of a single run (text span with uniform formatting) */
export interface RunFormat {
  fontName?: string;
  fontSize?: number; // half-points in OOXML
  bold?: boolean;
  italic?: boolean;
  underline?: string;
  strike?: boolean;
  color?: string; // hex without #
  highlight?: string;
  vertAlign?: string; // superscript, subscript
  smallCaps?: boolean;
  allCaps?: boolean;
}

/** A mapped run within a paragraph */
export interface MappedRun {
  /** Index of this run within its paragraph's runs array */
  runIndex: number;
  /** Original text content */
  text: string;
  /** Character offset within the paragraph's full text */
  charOffset: number;
  /** Character length */
  charLength: number;
  /** Formatting snapshot at map time */
  format: RunFormat;
  /** Reference to the XML node path for surgical editing */
  xmlPath: string;
}

/** Paragraph-level properties */
export interface ParagraphProps {
  styleName?: string;
  alignment?: string;
  numId?: string; // numbering/list ID
  numLevel?: number; // numbering level (0-based)
  indentLeft?: number;
  indentRight?: number;
  indentFirstLine?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  lineSpacing?: number;
}

/** A mapped paragraph */
export interface MappedParagraph {
  /** Index within the document body */
  paraIndex: number;
  /** Full concatenated text of all runs */
  fullText: string;
  /** Paragraph-level properties */
  props: ParagraphProps;
  /** Individual runs with formatting */
  runs: MappedRun[];
  /** Detected content section (contact, summary, experience, education, skills, etc.) */
  section?: string;
}

/** The complete structural map of a document */
export interface DocumentMap {
  paragraphs: MappedParagraph[];
  /** Total paragraph count at map time (for quality check) */
  totalParagraphs: number;
  /** Metadata preserved from the original document */
  metadata: Record<string, string>;
}

/** A single text replacement operation */
export interface TextReplacement {
  /** Original text to find */
  original: string;
  /** New text to replace with */
  replacement: string;
  /** Reason for the change (for UI) */
  reason: string;
  /** Which section this change belongs to */
  section: string;
}

/** Result of applying a single replacement */
export interface ReplacementResult {
  /** Whether the replacement was applied */
  applied: boolean;
  /** The paragraph index where it was applied */
  paraIndex?: number;
  /** Run indices that were modified */
  runIndices?: number[];
  /** If not applied, the reason */
  skipReason?: string;
  /** Whether any formatting drift was detected */
  formattingDrift?: boolean;
  /** Details of drift if detected */
  driftDetails?: string;
}

/** Quality check result */
export interface QualityCheckResult {
  valid: boolean;
  paragraphCountMatch: boolean;
  originalCount: number;
  currentCount: number;
  corruptionDetected: boolean;
  formattingDrifts: Array<{
    paraIndex: number;
    runIndex: number;
    field: string;
    expected: string;
    actual: string;
  }>;
}
