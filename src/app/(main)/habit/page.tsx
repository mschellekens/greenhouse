"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { HabitDetail } from "@/components/HabitDetail";

function HabitPageInner() {
  const id = useSearchParams().get("id");
  const app = useApp();
  const habit = app.state.habits.find((h) => h.id === id);
  const home = `/${app.state.settings.defaultView}`;
  return (
    <div>
      <Link href={home} className="mb-2 inline-flex h-10 items-center text-[14px] text-muted-strong">
        ← {app.state.settings.defaultView === "map" ? "Map" : "Garden"}
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
