import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} - AI workspace for chat, coding, research and productivity`;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #030712 0%, #070a13 45%, #07131f 100%)",
          color: "white",
          padding: 64,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <img
            src={logoSrc}
            alt=""
            width={360}
            height={240}
            style={{
              objectFit: "cover",
              borderRadius: 32,
              boxShadow: "0 24px 80px rgba(34, 211, 238, 0.22)",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: "#67e8f9",
                fontWeight: 800,
              }}
            >
              AI Workspace
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 68,
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              {siteConfig.name}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              maxWidth: 960,
              fontSize: 58,
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: -2,
            }}
          >
            Chat, code, research and organize work in one AI command center.
          </div>

          <div
            style={{
              marginTop: 34,
              display: "flex",
              gap: 16,
              color: "#cbd5e1",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <span>AI chat</span>
            <span style={{ color: "#334155" }}>+</span>
            <span>Code help</span>
            <span style={{ color: "#334155" }}>+</span>
            <span>Research</span>
            <span style={{ color: "#334155" }}>+</span>
            <span>Projects</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
