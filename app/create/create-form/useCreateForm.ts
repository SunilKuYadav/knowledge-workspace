"use client";

import { useState } from "react";
import type { Tab } from "./types";

export function useCreateForm() {
  const [activeTab, setActiveTab] = useState<Tab>("topic");
  return { activeTab, setActiveTab };
}
