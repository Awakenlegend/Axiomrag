import { invokeLLM } from "../_core/llm";
import { extractiveAnswer } from "./verification";
import type { ScoredChunk } from "./types";

export async function generateAnswer(question: string, evidence: ScoredChunk[]) {
  const context = evidence.map((item, index) => `[S${index + 1}] ${item.text}`).join("\n\n");
  try {
    const overview = /\b(main idea|summary|summarize|overview|what is this|what does this document)\b/i.test(question);
    const response = await invokeLLM({ maxTokens: 1400, messages: [
      { role: "system", content: overview ? "Answer using only the supplied document excerpts. Synthesize the clearest themes in 2-4 natural sentences. Do not invent facts. Include source tags such as [S1] after relevant sentences. If the excerpts contain no meaningful answer, say the documents do not contain enough information." : "Answer using only the supplied document excerpts. Write 2-4 clear sentences. Do not invent facts. Include source tags such as [S1] after relevant sentences. If the excerpts do not answer the question, say the documents do not contain enough information." },
      { role: "user", content: `Question: ${question}\n\nDocument excerpts:\n${context}` },
    ] });
    const choice = response.choices?.[0]; const content = choice?.message?.content;
    const answer = typeof content === "string" ? content.trim() : "";
    if (choice?.finish_reason === "length") return extractiveAnswer(question, evidence);
    const cleaned = answer.replace(/\s+\[S\d+$/i, "").trim();
    if (cleaned.length > 20) return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
  } catch (error) {
    console.warn("Grounded answer generation unavailable; using extractive fallback.", error instanceof Error ? error.message : error);
  }
  return extractiveAnswer(question, evidence);
}


