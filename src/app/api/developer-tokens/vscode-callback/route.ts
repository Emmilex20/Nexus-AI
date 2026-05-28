import { NextResponse } from "next/server";
import { planHasVsCodeAccess, planLimits } from "@/config/billing";
import { createDeveloperToken } from "@/lib/developer-tokens";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const VSCODE_REDIRECT_PREFIX = "vscode://nexus-ai.nexus-ai-vscode/connect";

function isValidVsCodeRedirect(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "vscode:" &&
      url.hostname === "nexus-ai.nexus-ai-vscode" &&
      url.pathname === "/connect"
    );
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function vscodeConnectHtml(callbackUrl: string) {
  return `<!doctype html>
<html>
  <head>
    <title>Nexus AI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        align-items: center;
        background: #070a18;
        color: white;
        display: flex;
        font-family: system-ui, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }
      main {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 24px;
        max-width: 560px;
        padding: 32px;
      }
      p { color: #94a3b8; line-height: 1.7; }
      a {
        background: white;
        border-radius: 999px;
        color: #020617;
        display: inline-flex;
        font-weight: 800;
        margin-top: 12px;
        padding: 12px 18px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Opening VS Code...</h1>
      <p>Your Nexus AI developer token was created and will be stored securely by the VS Code extension. Approve the browser prompt to finish connecting.</p>
      <a href="${escapeHtml(callbackUrl)}">Open VS Code</a>
    </main>
    <script>
      window.setTimeout(() => {
        window.location.href = ${JSON.stringify(callbackUrl)};
      }, 250);
    </script>
  </body>
</html>`;
}

function vscodeUpgradeHtml(currentPlan: string) {
  const planCards = Object.entries(planLimits)
    .filter(([, plan]) => plan.vscodeMonthlyRequests > 0)
    .map(
      ([, plan]) =>
        `<li><strong>${escapeHtml(plan.name)}</strong> - ${escapeHtml(
          plan.monthlyPrice
        )}/month, ${plan.vscodeMonthlyRequests.toLocaleString()} VS Code requests/month</li>`
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <title>Nexus AI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        align-items: center;
        background: #070a18;
        color: white;
        display: flex;
        font-family: system-ui, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }
      main {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 24px;
        max-width: 640px;
        padding: 32px;
      }
      p, li { color: #94a3b8; line-height: 1.7; }
      a {
        background: white;
        border-radius: 999px;
        color: #020617;
        display: inline-flex;
        font-weight: 800;
        margin-top: 12px;
        padding: 12px 18px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Upgrade to connect VS Code</h1>
      <p>Your current plan is ${escapeHtml(
        currentPlan
      )}. VS Code integration is included on paid coding plans:</p>
      <ul>${planCards}</ul>
      <a href="/billing">View plans</a>
    </main>
  </body>
</html>`;
}

export async function GET(req: Request) {
  const user = await getCurrentDbUser();
  const url = new URL(req.url);

  if (!user) {
    const signInUrl = new URL("/sign-in", url.origin);

    signInUrl.searchParams.set("redirect_url", `${url.pathname}${url.search}`);

    return NextResponse.redirect(signInUrl);
  }

  const redirect = url.searchParams.get("redirect") ?? VSCODE_REDIRECT_PREFIX;
  const name = url.searchParams.get("name") || "VS Code";

  if (!isValidVsCodeRedirect(redirect)) {
    return NextResponse.json({ error: "Invalid redirect URI" }, { status: 400 });
  }

  if (!planHasVsCodeAccess(user.plan)) {
    return new NextResponse(vscodeUpgradeHtml(planLimits[user.plan].name), {
      status: 403,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
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

  return new NextResponse(vscodeConnectHtml(callbackUrl.toString()), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
