import {
  Brain,
  CreditCard,
  FolderKanban,
  History,
  Image,
  LayoutDashboard,
  Settings,
} from "lucide-react";

export const appNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
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
