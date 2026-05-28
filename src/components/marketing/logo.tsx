import Link from "next/link";
import { BrandMark } from "@/components/shared/brand-mark";
import { siteConfig } from "@/config/site";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <BrandMark className="h-11 w-11" priority />

      <div className="leading-tight">
        <p className="text-base font-black tracking-tight text-white">
          {siteConfig.name}
        </p>
        <p className="text-xs text-slate-400">AI Workspace</p>
      </div>
    </Link>
  );
}
