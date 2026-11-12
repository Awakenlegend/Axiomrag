import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export class UploadError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "UploadError";
  }
}

type DecodedUpload = { name: string; type: string; buffer: Buffer };

export function decodeUpload(suppliedName: unknown, suppliedType: unknown, data: unknown): DecodedUpload {
  if (typeof suppliedName !== "string" || typeof data !== "string") throw new UploadError(400, "Choose a PDF or TXT document to upload.");
  const name = suppliedName.replace(/\\/g, "/").split("/").pop()?.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 255) ?? "";
  const type = typeof suppliedType === "string" ? suppliedType.slice(0, 160) : "";
  if (!name) throw new UploadError(400, "The uploaded file needs a valid filename.");
  const isPdf = name.toLowerCase().endsWith(".pdf") || type.includes("pdf");
  const isTxt = name.toLowerCase().endsWith(".txt") || type.startsWith("text/");
  if (!isPdf && !isTxt) throw new UploadError(415, "Only PDF and TXT files are supported.");
  const buffer = Buffer.from(data.replace(/^data:[^,]*,/, ""), "base64");
  if (!buffer.length) throw new UploadError(400, "The uploaded file is empty or invalid.");
  if (buffer.byteLength > MAX_FILE_BYTES) throw new UploadError(413, "File exceeds the 50 MB limit.");
  return { name, type: type || (isPdf ? "application/pdf" : "text/plain"), buffer };
}

export async function prepareUpload(suppliedName: unknown, suppliedType: unknown, data: unknown) {
  const upload = decodeUpload(suppliedName, suppliedType, data);
  let text: string;
  try {
    text = await extractText(upload.name, upload.type, upload.buffer);
  } catch (error) {
    throw new UploadError(422, error instanceof Error ? error.message : "This file could not be read. Try a text-based PDF or TXT file.");
  }
  const parts = chunkText(text);
  if (!parts.length) throw new UploadError(422, "No readable text was found. This may be a scanned PDF; try a text-based PDF or TXT file.");
  return { ...upload, parts };
}


const STOP = new Set("the a an and or to of in on for with from by is are was were this that how does do can into as it its be improve system using when should not all across every each more than what why where".split(" "));
const normalizeToken = (token: string) => ({ selection: "select", selected: "select", selecting: "select", retrieval: "retriev", retrieved: "retriev", retrieve: "retriev", combines: "combin", answers: "answer", answered: "answer", generation: "generat", generated: "generat", systems: "system" } as Record<string, string>)[token] ?? token;
export const tokenize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(token => token.length > 2 && !STOP.has(token)).map(normalizeToken);
export const sentenceSplit = (value: string) => {
  const protectedText = value.replace(/(\w)\.(\d)/g, "$1§$2").replace(/(\d)\.(\d)/g, "$1§$2");
  return (protectedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(sentence => sentence.replace(/§/g, ".").trim()).filter(Boolean) ?? []);
};
export const toTerms = (text: string) => tokenize(text).reduce<Record<string, number>>((terms, token) => { terms[token] = (terms[token] ?? 0) + 1; return terms; }, {});
export const cosine = (left: Record<string, number>, right: Record<string, number>) => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (const key of keys) { dot += (left[key] ?? 0) * (right[key] ?? 0); leftNorm += (left[key] ?? 0) ** 2; rightNorm += (right[key] ?? 0) ** 2; }
  return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
};

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];
  const sentences = sentenceSplit(normalized);
  if (sentences.length > 1) {
    const output: string[] = [];
    for (let index = 0; index < sentences.length; index += 3) {
      const part = sentences.slice(index, index + 4).join(" ");
      if (part.trim()) output.push(part);
      if (index + 4 >= sentences.length) break;
    }
    return output;
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 145) return [normalized];
  const output: string[] = [];
  for (let index = 0; index < words.length; index += 110) {
    const part = words.slice(index, index + 145).join(" ");
    if (part) output.push(part);
    if (index + 145 >= words.length) break;
  }
  return output;
}

export async function extractText(name: string, type: string, buffer: Buffer): Promise<string> {
  if (type.includes("text") || name.toLowerCase().endsWith(".txt")) return buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (type.includes("pdf") || name.toLowerCase().endsWith(".pdf")) {
    const temp = path.join(os.tmpdir(), `axiomrag-${randomUUID()}.pdf`);
    await fs.writeFile(temp, buffer);
    try {
      const result = await execFileAsync("pdftotext", ["-layout", temp, "-"], { maxBuffer: 20 * 1024 * 1024, timeout: 30_000 });
      return result.stdout;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") throw new Error("PDF extraction is unavailable on this server. Please retry later or upload a TXT file.");
      throw new Error("This PDF could not be read. Try a text-based PDF or export it as TXT.");
    } finally {
      await fs.rm(temp, { force: true });
    }
  }
  throw new Error("Only PDF and TXT files are supported.");
}


