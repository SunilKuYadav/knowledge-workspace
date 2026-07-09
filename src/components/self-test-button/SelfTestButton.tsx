"use client";

import Link from "next/link";
import type { SelfTestButtonProps } from "./types";

export default function SelfTestButton({ itemId }: SelfTestButtonProps) {
  return (
    <Link
      href={`/self-test?topicId=${itemId}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
    >
      🧠 Self Test
    </Link>
  );
}
