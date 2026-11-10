"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Mark } from "@/components/Brand";

export default function Home() {
  const { ready, state } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(state.settings.onboarded ? "/map" : "/welcome");
  }, [ready, state.settings.onboarded, router]);
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Mark size={48} className="animate-pulse" />
    </main>
  );
}
