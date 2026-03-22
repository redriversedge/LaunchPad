/**
 * PDF-to-DOCX Conversion Module
 *
 * Converts PDF resume text into a proper .docx file with clean formatting.
 * Uses the `docx` npm library to build a real OOXML document from extracted text.
 *
 * The resulting .docx can then be fed into the surgical editor for
 * format-preserving tailoring.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopPosition,
  TabStopType,
} from "docx";

export type ConversionConfidence = "high" | "medium" | "low";

export interface ConversionResult {
  /** The generated .docx as a Buffer */
  docxBuffer: Buffer;
  /** How confident we are in the conversion quality */
  confidence: ConversionConfidence;
  /** Specific issues found during conversion */
  issues: string[];
  /** Whether the PDF appeared to be scanned/image-only */
  isScanned: boolean;
}

interface ParsedResumeData {
  name?: string | null;
  headline?: string | null;
  summary?: string | null;
  currentLocation?: string | null;
  email?: string | null;
  phone?: string | null;
  skills?: Array<{ name: string; category?: string | null }>;
  workHistory?: Array<{
    company: string;
    title: string;
    location?: string | null;
    startDate: string;
    endDate?: string | null;
    isCurrent: boolean;
    bullets?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string | null;
    dateObtained?: string | null;
  }>;
}

/**
 * Assess the quality of extracted PDF text to determine conversion confidence.
 */
export function assessPdfExtraction(rawText: string): {
  confidence: ConversionConfidence;
  issues: string[];
  isScanned: boolean;
} {
  const issues: string[] = [];
  let score = 100;

  // Check for scanned/image-only PDF (very little or no text)
  const trimmed = rawText.trim();
  if (trimmed.length < 50) {
    return {
      confidence: "low",
      issues: [
        "PDF appears to be scanned or image-only. Very little text was extracted. " +
        "For best results, upload a .docx version of your resume.",
      ],
      isScanned: true,
    };
  }

  // Check for garbled text (high ratio of non-printable characters)
  const nonPrintable = rawText.replace(/[\x20-\x7E\n\r\t]/g, "").length;
  const nonPrintableRatio = nonPrintable / rawText.length;
  if (nonPrintableRatio > 0.15) {
    issues.push("High ratio of non-standard characters detected. Text may be garbled from font encoding issues.");
    score -= 30;
  }

  // Check for reasonable paragraph count (resumes typically have 10-100 paragraphs)
  const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 3) {
    issues.push("Very few text blocks extracted. Some content may be missing or in images.");
    score -= 20;
  }

  // Check for common resume keywords
  const keywords = ["experience", "education", "skills", "summary", "work", "professional"];
  const lowerText = rawText.toLowerCase();
  const foundKeywords = keywords.filter((k) => lowerText.includes(k));
  if (foundKeywords.length < 2) {
    issues.push("Few standard resume sections detected. Document structure may not have been preserved.");
    score -= 15;
  }

  // Check for excessive whitespace (sign of multi-column layout linearization)
  const excessiveSpaces = (rawText.match(/\s{10,}/g) || []).length;
  if (excessiveSpaces > 5) {
    issues.push("Excessive whitespace detected. This may indicate a multi-column layout that was linearized.");
    score -= 10;
  }

  // Check for very long lines (sign of merged columns)
  const longLines = rawText.split("\n").filter((l) => l.trim().length > 200);
  if (longLines.length > 3) {
    issues.push("Very long text lines found. Multi-column content may have been merged incorrectly.");
    score -= 10;
  }

  let confidence: ConversionConfidence;
  if (score >= 80) confidence = "high";
  else if (score >= 50) confidence = "medium";
  else confidence = "low";

  return { confidence, issues, isScanned: false };
}

/**
 * Build a clean .docx file from structured resume data.
 * Creates a properly formatted document with standard resume sections.
 */
export async function buildDocxFromResumeData(
  data: ParsedResumeData,
  rawText: string
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Name / Header
  if (data.name && data.name.trim()) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.name,
            bold: true,
            size: 28, // 14pt
            font: "Calibri",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      })
    );
  }

  // Contact line
  const contactParts: string[] = [];
  if (data.currentLocation?.trim()) contactParts.push(data.currentLocation);
  if (data.email?.trim()) contactParts.push(data.email);
  if (data.phone?.trim()) contactParts.push(data.phone);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: 20, // 10pt
            font: "Calibri",
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Headline
  if (data.headline?.trim()) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.headline,
            size: 22, // 11pt
            font: "Calibri",
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Summary
  if (data.summary?.trim()) {
    children.push(createSectionHeader("Professional Summary"));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.summary,
            size: 22,
            font: "Calibri",
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    children.push(createSectionHeader("Skills"));

    // Group by category
    const categories = new Map<string, string[]>();
    for (const skill of data.skills) {
      const cat = skill.category ?? "General";
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(skill.name);
    }

    if (categories.size === 1) {
      // Single category: comma-separated list
      const allSkills = data.skills.map((s) => s.name).join(", ");
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: allSkills, size: 22, font: "Calibri" }),
          ],
          spacing: { after: 200 },
        })
      );
    } else {
      // Multiple categories: labeled groups
      for (const [category, skills] of categories) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${category}: `,
                bold: true,
                size: 22,
                font: "Calibri",
              }),
              new TextRun({
                text: skills.join(", "),
                size: 22,
                font: "Calibri",
              }),
            ],
            spacing: { after: 60 },
          })
        );
      }
      // Add spacing after skills section
      children.push(new Paragraph({ spacing: { after: 120 } }));
    }
  }

  // Work History
  if (data.workHistory && data.workHistory.length > 0) {
    children.push(createSectionHeader("Professional Experience"));

    for (const job of data.workHistory) {
      // Job title and date range on same line
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: job.title,
              bold: true,
              size: 22,
              font: "Calibri",
            }),
          ],
          spacing: { before: 120, after: 0 },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
        })
      );

      // Company, location, dates
      const datePart = `${job.startDate} - ${job.endDate || "Present"}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: job.company,
              italics: true,
              size: 22,
              font: "Calibri",
            }),
            ...(job.location
              ? [
                  new TextRun({
                    text: `, ${job.location}`,
                    italics: true,
                    size: 22,
                    font: "Calibri",
                  }),
                ]
              : []),
            new TextRun({
              text: `  |  ${datePart}`,
              size: 20,
              font: "Calibri",
              color: "666666",
            }),
          ],
          spacing: { after: 60 },
        })
      );

      // Bullets
      if (job.bullets) {
        for (const bullet of job.bullets) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: bullet,
                  size: 22,
                  font: "Calibri",
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    }
  }

  // Education
  if (data.education && data.education.length > 0) {
    children.push(createSectionHeader("Education"));

    for (const edu of data.education) {
      const degreeText = edu.field
        ? `${edu.degree} in ${edu.field}`
        : edu.degree;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: degreeText,
              bold: true,
              size: 22,
              font: "Calibri",
            }),
          ],
          spacing: { before: 60, after: 0 },
        })
      );

      const parts: TextRun[] = [
        new TextRun({
          text: edu.institution,
          italics: true,
          size: 22,
          font: "Calibri",
        }),
      ];

      if (edu.endDate || edu.startDate) {
        const dateStr = edu.startDate
          ? `${edu.startDate} - ${edu.endDate || "Present"}`
          : edu.endDate || "";
        parts.push(
          new TextRun({
            text: `  |  ${dateStr}`,
            size: 20,
            font: "Calibri",
            color: "666666",
          })
        );
      }

      children.push(
        new Paragraph({
          children: parts,
          spacing: { after: 100 },
        })
      );
    }
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    children.push(createSectionHeader("Certifications"));

    for (const cert of data.certifications) {
      const parts: TextRun[] = [
        new TextRun({
          text: cert.name,
          bold: true,
          size: 22,
          font: "Calibri",
        }),
      ];

      if (cert.issuer) {
        parts.push(
          new TextRun({
            text: ` - ${cert.issuer}`,
            size: 22,
            font: "Calibri",
          })
        );
      }

      if (cert.dateObtained) {
        parts.push(
          new TextRun({
            text: ` (${cert.dateObtained})`,
            size: 20,
            font: "Calibri",
            color: "666666",
          })
        );
      }

      children.push(
        new Paragraph({
          children: parts,
          spacing: { after: 60 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              bottom: 720,
              left: 1080, // 0.75 inch
              right: 1080,
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

/** Create a section header with bottom border */
function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 22,
        font: "Calibri",
        color: "2B579A",
      }),
    ],
    spacing: { before: 240, after: 80 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: "2B579A",
      },
    },
  });
}

/**
 * Full PDF conversion pipeline:
 * 1. Extract text from PDF (already done by caller)
 * 2. Assess extraction quality
 * 3. Build .docx from structured data
 * 4. Return result with confidence scoring
 */
export async function convertPdfToDocx(
  rawText: string,
  structuredData: ParsedResumeData
): Promise<ConversionResult> {
  // Assess extraction quality
  const assessment = assessPdfExtraction(rawText);

  if (assessment.isScanned) {
    // For scanned PDFs, we still try to build a doc from whatever AI parsed
    const docxBuffer = await buildDocxFromResumeData(structuredData, rawText);
    return {
      docxBuffer,
      confidence: "low",
      issues: assessment.issues,
      isScanned: true,
    };
  }

  // Build .docx from the structured data
  const docxBuffer = await buildDocxFromResumeData(structuredData, rawText);

  return {
    docxBuffer,
    confidence: assessment.confidence,
    issues: assessment.issues,
    isScanned: false,
  };
}
