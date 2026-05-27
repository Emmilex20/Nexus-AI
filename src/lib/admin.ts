import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/current-user";

export async function getAdminUser() {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}
