import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_MODEL = "openrouter/free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { text, apiKey } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided for summarization." },
        { status: 400 }
      );
    }

    const resolvedApiKey = apiKey || process.env.OPENROUTER_API_KEY;

    if (!resolvedApiKey) {
      return NextResponse.json(
        { error: "No OpenRouter API key provided. Please enter your API key." },
        { status: 401 }
      );
    }

    const systemPrompt = `You are an expert document analyst. Analyze the provided PDF text and produce a structured, insightful summary.

Return your response as valid JSON with the following structure:
{
  "title": "Inferred or detected document title (string)",
  "overview": "A concise 2-3 sentence overview of the document (string)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "..."],
  "topics": ["Topic 1", "Topic 2", "..."],
  "sentiment": "positive | neutral | negative | mixed",
  "complexity": "beginner | intermediate | advanced",
  "actionItems": ["Action item 1", "..."] 
}

Rules:
- keyPoints: 5-8 most important takeaways from the document
- topics: 3-6 main subject areas covered
- actionItems: any tasks, recommendations, or next steps mentioned (can be empty array)
- Output ONLY valid JSON, no markdown, no extra text`;

    // Truncate to ~12k chars to stay within token limits while keeping cost low
    const truncatedText = text.length > 12000 ? text.slice(0, 12000) + "\n...[truncated]" : text;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pdfcraft.app",
        "X-Title": "PDFCraft AI Summarizer",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: truncatedText },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenRouter error:", errBody);
      return NextResponse.json(
        { error: `OpenRouter API error: ${errBody || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ hasSystemKey: !!process.env.OPENROUTER_API_KEY });
}
