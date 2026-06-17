import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

async function getVersion() {
  try {
    const raw = await readFile(path.join(process.cwd(), "package.json"), "utf8");
    return (JSON.parse(raw) as { version?: string }).version || "local";
  } catch {
    return "local";
  }
}

export async function GET() {
  return NextResponse.json({
    version: await getVersion(),
    authMode: process.env.ADMISSION_OS_AUTH_MODE || "local",
    dataDriver: process.env.ADMISSION_OS_DATA_DRIVER || "file",
    dataFile: "data/eduos.local.json",
    cookieSecure: process.env.ADMISSION_OS_COOKIE_SECURE || "auto",
  });
}
