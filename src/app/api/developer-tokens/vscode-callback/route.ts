import { NextResponse } from "next/server";
import { createDeveloperToken } from "@/lib/developer-tokens";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const VSCODE_REDIRECT_PREFIX = "vscode://nexus-ai.nexus-ai-vscode/connect";

export async function GET(req: Request) {
  const user = await getCurrentDbUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") ?? "";
  const name = url.searchParams.get("name") || "VS Code";

  if (!redirect.startsWith(VSCODE_REDIRECT_PREFIX)) {
    return NextResponse.json({ error: "Invalid redirect URI" }, { status: 400 });
  }

  const activeTokenCount = await prisma.developerToken.count({
    where: {
      userId: user.id,
      revokedAt: null,
    },
  });

  if (activeTokenCount >= 5) {
    return new NextResponse(
      `
<!doctype html>
<html>
  <head>
    <title>Nexus AI</title>
    <style>
      body {
        background: #070a18;
        color: white;
        font-family: system-ui, sans-serif;
        margin: 0;
        padding: 48px;
      }
      main {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 24px;
        margin: 0 auto;
        max-width: 560px;
        padding: 32px;
      }
      p { color: #94a3b8; line-height: 1.7; }
      a { color: #67e8f9; }
    </style>
  </head>
  <body>
    <main>
      <h1>Too many developer tokens</h1>
      <p>You can have up to 5 active developer tokens. Revoke an old token in Nexus AI settings, then connect VS Code again.</p>
      <a href="/settings">Open settings</a>
    </main>
  </body>
</html>`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  }

  const { token } = await createDeveloperToken(user.id, name.slice(0, 60));
  const callbackUrl = new URL(redirect);

  callbackUrl.searchParams.set("token", token);
  callbackUrl.searchParams.set("apiUrl", url.origin);

  return NextResponse.redirect(callbackUrl);
}
