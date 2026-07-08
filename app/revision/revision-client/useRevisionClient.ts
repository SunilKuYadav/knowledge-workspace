"use client";

import { useState } from "react";
import type { ViewTab } from "../lib/types";

export function useRevisionClient() {
  const [activeTab, setActiveTab] = useState<ViewTab>("session");
  return { activeTab, setActiveTab };
}
