"use client";

import { UserButton } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type MountedUserButtonProps = {
  placeholderClassName?: string;
};

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function MountedUserButton({
  placeholderClassName,
}: MountedUserButtonProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-8 w-8 shrink-0 rounded-full bg-white/10",
          placeholderClassName
        )}
      />
    );
  }

  return <UserButton />;
}
