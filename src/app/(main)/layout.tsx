"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/Nav";
import { TellBar } from "@/components/TellBar";
import { ToastBar } from "@/components/Toast";
import { Mark } from "@/components/Brand";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { ready, state } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (ready && !state.settings.onboarded) router.replace("/welcome");
  }, [ready, state.settings.onboarded, router]);
  if (!ready || !state.settings.onboarded)
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Mark size={48} className="animate-pulse" />
      </main>
    );
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="px-4 pb-44 pt-6">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="px-3">
          <ToastBar />
        </div>
        <div className="bg-gradient-to-t from-ivory via-ivory/95 to-ivory/0 pt-3">
          <TellBar />
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
