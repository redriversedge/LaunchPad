import { parseOffice } from "officeparser";

export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const extension = fileName.toLowerCase().split(".").pop();

  if (!extension || !["pdf", "docx", "doc"].includes(extension)) {
    throw new Error(`Unsupported file type: ${extension}. Please upload a PDF or Word document.`);
  }

  const result = await parseOffice(buffer);
  const text = typeof result === "string" ? result : String(result);

  if (!text || text.trim().length === 0) {
    throw new Error("Could not extract text from the file. The document may be image-based or empty.");
  }

  return text.trim();
}
