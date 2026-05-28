import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      name: siteConfig.name,
      service: "nexus-ai-vscode",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
