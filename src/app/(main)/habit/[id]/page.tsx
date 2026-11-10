"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { HabitDetail } from "@/components/HabitDetail";

export default function HabitPage() {
  const { id } = useParams<{ id: string }>();
  const app = useApp();
  const habit = app.state.habits.find((h) => h.id === id);
  return (
    <div>
      <Link href="/map" className="mb-2 inline-block text-sm text-ink-500">
        ← Back
      </Link>
      {habit ? <HabitDetail habit={habit} /> : <p className="text-sm text-ink-500">This habit no longer exists.</p>}
    </div>
  );
}
