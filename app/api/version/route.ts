import { NextResponse } from "next/server";

// Increment this whenever you deploy a new version to production
const APP_VERSION = "1.0.1";

export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
