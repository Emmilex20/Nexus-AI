import { SuspendedNotice } from "@/components/dashboard/suspended-notice";
import { getCurrentDbUser } from "@/lib/current-user";

export default async function SuspendedPage() {
  const user = await getCurrentDbUser();

  return <SuspendedNotice reason={user?.suspensionReason} />;
}
