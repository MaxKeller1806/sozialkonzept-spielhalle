"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";

interface FeedbackItem {
  id: number;
  category: "frage" | "anregung";
  message: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string | null;
}

export default function FeedbackAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/feedback")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.feedback) setItems(d.feedback);
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Rückmeldungen Mitarbeiter" />

      {items.length === 0 ? (
        <Card>
          <p className="text-center text-slate-600">
            Noch keine Rückmeldungen eingegangen.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((f) => (
            <li key={f.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        f.category === "frage"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {f.category === "frage" ? "Frage" : "Anregung"}
                    </span>
                    <p className="mt-2 font-semibold">
                      {f.firstName} {f.lastName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {f.email}
                      {f.location ? ` · ${f.location}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-slate-400">
                    {new Date(f.createdAt).toLocaleString("de-DE")}
                  </time>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-slate-700">
                  {f.message}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
