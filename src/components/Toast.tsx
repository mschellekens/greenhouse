"use client";
import { useApp } from "@/lib/store";

export function ToastBar() {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;
  return (
    <div key={toast.id} role="status" className="rise mx-auto mb-2 flex max-w-md items-center justify-between gap-3 rounded-2xl bg-forest px-4 py-3 text-sm text-cream shadow-lg">
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          className="rounded-full px-3 py-1 font-semibold text-sage-200 hover:bg-white/10"
          onClick={() => {
            toast.undo?.();
            dismissToast();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
