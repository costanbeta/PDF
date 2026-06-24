import { NextRequest } from "next/server";
import { isSafeUrl } from "@/lib/security";

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new Response("Missing url parameter", { status: 400 });
  }

  const trimmedUrl = urlParam.trim();
  if (!isSafeUrl(trimmedUrl)) {
    return new Response("Forbidden or invalid URL destination", { status: 400 });
  }

  try {
    const response = await fetch(trimmedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      return new Response(`Failed to fetch resource: ${response.statusText}`, { status: response.status });
    }

    // Verify redirected URL is also safe
    if (response.url && !isSafeUrl(response.url)) {
      return new Response("Forbidden redirect destination", { status: 403 });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // Strict Content-Type filtering: only allow image formats
    if (!contentType.startsWith("image/")) {
      return new Response("Forbidden resource type. Only images are allowed.", { status: 403 });
    }

    const data = await response.arrayBuffer();

    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to fetch resource";
    return new Response(errMsg, { status: 500 });
  }
}
