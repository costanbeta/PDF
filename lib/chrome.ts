import puppeteer from "puppeteer-core";
import fs from "fs";

export function getChromePath() {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  for (const path of paths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

export async function getBrowser() {
  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error(
      "Google Chrome was not found on your system. Please install Google Chrome to use the Website URL option."
    );
  }
  return await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security"
    ]
  });
}
