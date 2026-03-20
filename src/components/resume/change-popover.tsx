"use client";

import { useState, useRef, useEffect } from "react";

interface ChangePopoverProps {
  original: string;
  modified: string;
  reason: string;
  isReverted: boolean;
  onRevert: () => void;
  onRestore: () => void;
  onEdit: (newText: string) => void;
  children: React.ReactNode;
}

export function ChangePopover({
  original,
  modified,
  reason,
  isReverted,
  onRevert,
  onRestore,
  onEdit,
  children,
}: ChangePopoverProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(isReverted ? original : modified);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setEditText(isReverted ? original : modified);
  }, [isReverted, original, modified]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setEditing(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleSaveEdit() {
    onEdit(editText);
    setEditing(false);
  }

  return (
    <span className="relative inline">
      <span
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={`cursor-pointer transition-colors rounded px-0.5 -mx-0.5 ${
          isReverted
            ? "bg-gray-100 dark:bg-gray-700 border-b-2 border-dashed border-gray-400"
            : "bg-amber-50 dark:bg-amber-900/30 border-b-2 border-amber-300 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50"
        }`}
      >
        {children}
      </span>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 left-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 space-y-3"
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          {/* Why this was changed */}
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Why this was changed
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{reason}</p>
          </div>

          {/* Original vs Modified */}
          <div className="grid grid-cols-1 gap-2">
            <div>
              <div className="text-xs font-semibold text-red-500 dark:text-red-400 mb-0.5">Original</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800 leading-relaxed">
                {original}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-0.5">Modified</div>
              <div className="text-xs text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-800 leading-relaxed">
                {modified}
              </div>
            </div>
          </div>

          {/* Edit mode */}
          {editing && (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Edit</div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[60px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleSaveEdit}
                  className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditing(false); setEditText(isReverted ? original : modified); }}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!editing && (
            <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
              {isReverted ? (
                <button
                  onClick={() => { onRestore(); setOpen(false); }}
                  className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700"
                >
                  Use AI Version
                </button>
              ) : (
                <button
                  onClick={() => { onRevert(); setOpen(false); }}
                  className="text-xs px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Revert to Original
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Edit Myself
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
