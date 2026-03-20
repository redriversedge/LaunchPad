import pdf from "pdf-parse";
import mammoth from "mammoth";

export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const extension = fileName.toLowerCase().split(".").pop();

  if (!extension || !["pdf", "docx", "doc"].includes(extension)) {
    throw new Error(`Unsupported file type: ${extension}. Please upload a PDF or Word document.`);
  }

  let text: string;

  if (extension === "pdf") {
    const data = await pdf(buffer);
    text = data.text;
  } else {
    // docx/doc
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Could not extract text from the file. The document may be image-based or empty.");
  }

  return text.trim();
}
