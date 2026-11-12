import { cosine, sentenceSplit, toTerms, tokenize } from "./text";
import type { ScoredChunk } from "./types";

export function verifyClaims(answer: string, evidence: ScoredChunk[]) {
  const claims = sentenceSplit(answer).map((text, index) => {
    const terms = new Set(tokenize(text));
    const sourceScores = evidence.map(item => {
      const lexical = [...terms].filter(term => item.terms[term]).length / Math.max(1, terms.size);
      const semantic = cosine(toTerms(text), item.terms);
      return lexical * 0.55 + semantic * 0.45;
    });
    const support = Math.max(0, ...sourceScores);
    const contradiction = /\b(always|never|guarantee|guarantees|all|none)\b/i.test(text) && support < 0.62;
    const status = contradiction ? "Contradicted" : support >= 0.34 ? "Supported" : "Unsupported";
    return {
      id: `C${String(index + 1).padStart(2, "0")}`, text, support: Number(support.toFixed(2)),
      contradiction: Number((contradiction ? 1 - support : 0).toFixed(2)), status,
      reason: status === "Supported" ? "Supported by lexical overlap and semantic similarity" : status === "Contradicted" ? "Overconfident wording detected against source coverage" : "Insufficient source coverage",
      citations: evidence.filter(item => [...terms].some(term => item.terms[term]) || cosine(toTerms(text), item.terms) > 0.25).slice(0, 2).map(item => ({ document: item.document, chunkId: item.id })),
    };
  });
  const hallucinationRate = Number((claims.filter(claim => claim.status !== "Supported").length / Math.max(1, claims.length)).toFixed(2));
  return { claims, hallucinationRate };
}

export function extractiveAnswer(question: string, evidence: ScoredChunk[]) {
  const queryTerms = new Set(tokenize(question));
  const sentences = evidence.flatMap(item => sentenceSplit(item.text).map(sentence => {
    const terms = tokenize(sentence); const overlap = terms.filter(term => queryTerms.has(term)).length / Math.max(1, queryTerms.size);
    return { sentence, score: item.rerank * 0.5 + overlap * 0.5 };
  })).filter(item => !item.sentence.endsWith("?")).sort((left, right) => right.score - left.score);
  const unique = sentences.filter((item, index, list) => list.findIndex(candidate => candidate.sentence.toLowerCase() === item.sentence.toLowerCase()) === index).slice(0, 3);
  return unique.length ? `Based on the uploaded corpus: ${unique.map(item => item.sentence).join(" ")}` : "The selected evidence does not contain a complete answer.";
}


