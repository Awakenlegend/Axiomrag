export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export async function invokeLLM(params: {
  messages: LlmMessage[];
  model?: string;
  maxTokens?: number;
}): Promise<{ choices?: Array<{ finish_reason?: string | null; message?: { content?: unknown } }> }> {
  const apiUrl = process.env.MANUS_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiUrl || !apiKey) throw new Error("The Manus AI service is not configured for this project.");

  const payload: Record<string, unknown> = { messages: params.messages };
  if (params.model) payload.model = params.model;
  if (params.maxTokens) payload.max_tokens = params.maxTokens;

  let lastError = "LLM request failed.";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      if (attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
      continue;
    }

    if (response.ok) {
      const result = await response.json() as { error?: { message?: string }; choices?: Array<{ finish_reason?: string | null; message?: { content?: unknown } }> };
      if (result.error) throw new Error(result.error.message ?? "The Manus AI service returned an error.");
      return result;
    }

    const body = await response.text();
    lastError = `LLM request failed (${response.status}): ${body.slice(0, 500)}`;
    if ((response.status !== 429 && response.status < 500) || attempt === 2) break;
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : 400 * (attempt + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(lastError);
}
