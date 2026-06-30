"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors"
    >
      🖨️ Print / Save PDF
    </button>
  );
}
