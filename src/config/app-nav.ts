import {
  Brain,
  CreditCard,
  FolderKanban,
  History,
  Image,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { DASHBOARD_VIEW_PARAM } from "@/lib/last-conversation";

export const appNavItems = [
  {
    label: "Dashboard",
    href: `/dashboard?view=${DASHBOARD_VIEW_PARAM}`,
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Media",
    href: "/media",
    icon: Image,
  },
  {
    label: "Memory",
    href: "/memory",
    icon: Brain,
  },
  {
    label: "History",
    href: "/history",
    icon: History,
  },
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
