import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandMark({
  className,
  imageClassName,
  priority = false,
}: BrandMarkProps) {
  return (
    <span
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/10 shadow-lg shadow-cyan-500/10",
        className
      )}
    >
      <Image
        src="/android-chrome-192x192.png"
        alt=""
        fill
        sizes="48px"
        priority={priority}
        className={cn("object-cover", imageClassName)}
      />
    </span>
  );
}
