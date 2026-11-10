"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/Brand";
import { Nux } from "@/components/Nux";

function Intro() {
  const router = useRouter();
  const replay = useSearchParams().get("replay") === "1";
  const go = () => router.push(replay ? "/settings" : "/welcome?step=2");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <Wordmark />
        {replay && (
          <button className="h-10 px-2 text-[14px] text-muted-strong" onClick={go}>
            Close
          </button>
        )}
      </div>
      <Nux onDone={go} onSkip={go} doneLabel={replay ? "Back to Settings" : "Plant your first habits"} />
    </main>
  );
}

export default function IntroPage() {
  return (
    <Suspense fallback={null}>
      <Intro />
    </Suspense>
  );
}
