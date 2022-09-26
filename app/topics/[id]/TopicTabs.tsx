'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';

type TabKey = 'overview' | 'notes' | 'patterns' | 'mistakes';

interface TopicTabsProps {
  overview: string;
  notes: string;
  patterns: string;
  mistakes: string;
  editBasePath: string;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'notes', label: 'Notes' },
  { key: 'patterns', label: 'Patterns' },
  { key: 'mistakes', label: 'Mistakes' },
];

export default function TopicTabs({ overview, notes, patterns, mistakes, editBasePath }: TopicTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const content: Record<TabKey, string> = { overview, notes, patterns, mistakes };

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex items-center border-b border-zinc-200 dark:border-zinc-700 mb-6" role="tablist">
        <div className="flex flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Link
          href={`${editBasePath}/${activeTab}.md`}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Tab content */}
      <div className="prose prose-zinc dark:prose-invert max-w-none" role="tabpanel">
        {content[activeTab] ? (
          <MarkdownRenderer>
            {content[activeTab]}
          </MarkdownRenderer>
        ) : (
          <p className="text-zinc-400 dark:text-zinc-500 italic">
            No content yet. Click Edit to add content.
          </p>
        )}
      </div>
    </div>
  );
}
