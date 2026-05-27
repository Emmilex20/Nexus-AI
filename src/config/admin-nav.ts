import { CreditCard, LayoutDashboard, Users } from "lucide-react";

export const adminNavItems = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
];
