import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentDbUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      plan: user.plan,
      credits: user.credits,
      onboardingDone: user.onboardingDone,
      createdAt: user.createdAt,
    },
  });
}
