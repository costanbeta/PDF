import { NextRequest } from "next/server";
import { getBrowser } from "@/lib/chrome";

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  const widthParam = req.nextUrl.searchParams.get("width");

  if (!urlParam) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let url = urlParam.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const width = parseInt(widthParam || "1280", 10) || 1280;
  const height = 1200; // Fixed preview height matching mockup container

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // Set common desktop/device User-Agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Bypass common bot detection blockers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Navigate to page
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    // Wait a bit for JS & dynamic styling to render completely
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 85,
    });

    return new Response(Buffer.from(screenshot), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=120",
      },
    });
  } catch (error: unknown) {
    console.error("URL preview screenshot error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to render preview of target website";
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
