import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "nexus_vscode";

export function hashDeveloperToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createDeveloperToken(userId: string, name: string) {
  const secret = crypto.randomBytes(32).toString("base64url");
  const token = `${TOKEN_PREFIX}_${secret}`;
  const tokenPrefix = token.slice(0, 20);

  const developerToken = await prisma.developerToken.create({
    data: {
      userId,
      name,
      tokenHash: hashDeveloperToken(token),
      tokenPrefix,
    },
  });

  return {
    developerToken,
    token,
  };
}

export async function getUserFromDeveloperToken(authHeader: string | null) {
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return null;
  }

  const developerToken = await prisma.developerToken.findFirst({
    where: {
      tokenHash: hashDeveloperToken(token),
      revokedAt: null,
    },
    include: {
      user: true,
    },
  });

  if (!developerToken || developerToken.user.isSuspended) {
    return null;
  }

  await prisma.developerToken.update({
    where: {
      id: developerToken.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return {
    token: developerToken,
    user: developerToken.user,
  };
}
