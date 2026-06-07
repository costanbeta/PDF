import { NextRequest } from "next/server";
import { getBrowser } from "@/lib/chrome";

const PAGE_DIMENSIONS_INCHES = {
  A4: { width: 8.27, height: 11.69 },
  A3: { width: 11.69, height: 16.54 },
  Letter: { width: 8.5, height: 11 },
  Legal: { width: 8.5, height: 14 }
};

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  const widthParam = req.nextUrl.searchParams.get("width");
  const pageSizeParam = req.nextUrl.searchParams.get("pageSize") || "A4";
  const orientationParam = req.nextUrl.searchParams.get("orientation") || "portrait";
  const marginParam = req.nextUrl.searchParams.get("margin") || "none";
  const oneLongPageParam = req.nextUrl.searchParams.get("oneLongPage") === "true";

  if (!urlParam) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let url = urlParam.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const width = parseInt(widthParam || "1280", 10) || 1280;
  const pageSize = (pageSizeParam as keyof typeof PAGE_DIMENSIONS_INCHES) in PAGE_DIMENSIONS_INCHES
    ? (pageSizeParam as keyof typeof PAGE_DIMENSIONS_INCHES)
    : "A4";
  const orientation = orientationParam === "landscape" ? "landscape" : "portrait";
  const margin = marginParam as "none" | "small" | "big";

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1080 });

    // Set common desktop/device User-Agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Bypass simple anti-bot systems
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Navigate to page
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Emulate screen media to ensure styling looks like the website, not print sheet
    await page.emulateMediaType("screen");

    // Wait for dynamic layout and lazy elements to load
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // Resolve margin settings
    const marginOption = {
      none: { top: "0px", bottom: "0px", left: "0px", right: "0px" },
      small: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" },
      big: { top: "0.8in", bottom: "0.8in", left: "0.8in", right: "0.8in" }
    }[margin] || { top: "0px", bottom: "0px", left: "0px", right: "0px" };

    const dimensions = PAGE_DIMENSIONS_INCHES[pageSize];
    let pdfWidth = orientation === "landscape" ? dimensions.height : dimensions.width;
    let pdfHeight = orientation === "landscape" ? dimensions.width : dimensions.height;

    if (oneLongPageParam) {
      // Calculate full scroll height in pixels
      const scrollHeightPx = await page.evaluate(() => {
        return Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          document.documentElement.offsetHeight,
          document.body.offsetHeight
        );
      });
      // Convert to inches (96 DPI) and add 0.5in buffer
      pdfHeight = (scrollHeightPx / 96) + 0.5;
    }

    const pdfBuffer = await page.pdf({
      width: `${pdfWidth}in`,
      height: `${pdfHeight}in`,
      margin: marginOption,
      printBackground: true,
      preferCSSPageSize: false,
    });

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="webpage.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("URL to PDF conversion error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to convert website to PDF" }),
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
