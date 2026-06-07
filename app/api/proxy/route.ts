import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const targetUrl = new URL(urlParam);
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      return new Response(`Failed to fetch resource: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
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
