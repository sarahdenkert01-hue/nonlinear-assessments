"use client";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") return <span className="text-sm text-slate-500">Saving…</span>;
  if (status === "saved") return <span className="text-sm text-green-600">Saved</span>;
  if (status === "error") {
    return <span className="text-sm text-amber-600">Save failed — your changes may be unsaved</span>;
  }
  return null;
}
