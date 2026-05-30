import { Suspense } from "react";
import FrageForm from "./frage-form";

export default function FrageEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">Lädt…</div>
      }
    >
      <FrageForm />
    </Suspense>
  );
}
