import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    imageId: string;
  }>;
};

function getContentType(outputFormat: string) {
  if (outputFormat === "jpg") return "image/jpeg";
  if (outputFormat === "jpeg") return "image/jpeg";
  if (outputFormat === "png") return "image/png";
  if (outputFormat === "webp") return "image/webp";
  return "application/octet-stream";
}

export async function GET(req: Request, { params }: Params) {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId } = await params;
  const image = await prisma.generatedImage.findFirst({
    where: {
      id: imageId,
      userId: user.id,
    },
    select: {
      imageBase64: true,
      outputFormat: true,
    },
  });

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const shouldDownload = new URL(req.url).searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Content-Type": getContentType(image.outputFormat),
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  if (shouldDownload) {
    headers["Content-Disposition"] =
      `attachment; filename="nexus-generated-image-${imageId}.${image.outputFormat}"`;
  }

  return new Response(Buffer.from(image.imageBase64, "base64"), { headers });
}
