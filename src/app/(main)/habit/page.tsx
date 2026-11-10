"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { HabitDetail } from "@/components/HabitDetail";
import { useHomeHref } from "@/components/Nav";
import { HOME_VIEWS } from "@/lib/view";

function HabitPageInner() {
  const id = useSearchParams().get("id");
  const app = useApp();
  const habit = app.state.habits.find((h) => h.id === id);
  const home = useHomeHref();
  return (
    <div>
      <Link href={home.href} className="mb-2 inline-flex h-10 items-center text-[14px] text-muted-strong">
        ← {HOME_VIEWS.find((v) => v.id === home.view)!.label}
      </Link>
      {habit ? (
        <HabitDetail habit={habit} />
      ) : app.ready ? (
        <p className="text-[14px] text-muted-strong">This habit has been deleted.</p>
      ) : null}
    </div>
  );
}

export default function HabitPage() {
  return (
    <Suspense>
      <HabitPageInner />
    </Suspense>
  );
}
