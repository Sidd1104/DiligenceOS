"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Renders inline text with **bold** formatting and converts [Chunk X] tags into styled gold badge pills.
 */
function renderInlineText(text: string): React.ReactNode[] {
  // Regex to match [Chunk X] or [Chunk X, Chunk Y] tags or **bold text**
  const tokenRegex = /(\[Chunk\s+[\d,\s]+\]|\*\*[^*]+\*\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // 1. [Chunk X] Citation Tags
    const chunkMatch = part.match(/^\[Chunk\s+([\d,\s]+)\]$/i);
    if (chunkMatch) {
      const numbers = chunkMatch[1].split(",").map((n) => n.trim());
      return (
        <span key={idx} className="inline-flex items-center gap-1 mx-1 my-0.5 align-middle select-none">
          {numbers.map((num, nIdx) => (
            <span
              key={nIdx}
              className="inline-flex items-center rounded bg-[rgba(212,175,106,0.12)] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#d4af6a] border border-[rgba(212,175,106,0.25)] shadow-2xs"
            >
              Chunk {num}
            </span>
          ))}
        </span>
      );
    }

    // 2. **Bold Text**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-semibold text-[#f5f3ef]">
          {renderInlineText(boldText)}
        </strong>
      );
    }

    // 3. Regular Text Segment
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Parses markdown blocks (paragraphs, bullet lists, bold text, chunk tags)
 * into rich, structured HTML elements for institutional AI responses.
 */
export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListItems.length > 0) {
      blocks.push(
        <ul key={`list-${blocks.length}`} className="my-2 space-y-1.5 pl-1">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Check if line is a bullet item (* item or - item)
    const bulletMatch = trimmed.match(/^[*|-]\s+(.+)$/);
    if (bulletMatch) {
      const itemContent = bulletMatch[1];
      currentListItems.push(
        <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed text-[#f5f3ef]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d4af6a] shrink-0 mt-2 shadow-xs" />
          <span className="flex-1">{renderInlineText(itemContent)}</span>
        </li>
      );
    } else {
      flushList();
      // Regular paragraph or heading line
      if (trimmed.startsWith("### ")) {
        blocks.push(
          <h4 key={index} className="text-base font-semibold text-[#f5f3ef] font-heading mt-3 mb-1.5">
            {renderInlineText(trimmed.slice(4))}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        blocks.push(
          <h3 key={index} className="text-lg font-semibold text-[#f5f3ef] font-heading mt-4 mb-2">
            {renderInlineText(trimmed.slice(3))}
          </h3>
        );
      } else {
        blocks.push(
          <p key={index} className="text-sm leading-relaxed text-[#f5f3ef] my-1.5">
            {renderInlineText(trimmed)}
          </p>
        );
      }
    }
  });

  flushList();

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-[#f5f3ef]">
      {blocks}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-[#d4af6a] animate-pulse align-middle rounded-xs" />
      )}
    </div>
  );
}
