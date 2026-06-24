import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Best free-tier model on OpenRouter for translation tasks
const OPENROUTER_MODEL = "openrouter/free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, apiKey } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing required fields: text, targetLanguage" },
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

    const systemPrompt = `You are a professional document translator. Translate the provided text into ${targetLanguage} with high accuracy, preserving the original meaning, tone, and formatting as much as possible. Output ONLY the translated text — no explanations, no prefixes, no metadata.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pdfcraft.qzz.io",
        "X-Title": "PDFCraft Translate",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.2,
        max_tokens: 4096,
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
    const translated = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ translated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ hasSystemKey: !!process.env.OPENROUTER_API_KEY });
}
