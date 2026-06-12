"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { AdminShell } from "@/components/shell/admin-shell";
import { Button, LoadingStatus } from "@/components/ui";
import { fetchAuthMe } from "@/lib/auth-client";
import { isMasterCourseId } from "@/lib/course-editor-id";

const MASTER_EDITOR_PATH_PREFIX = "/dashboard/inhalte";

function isSuperuserMasterEditorPath(pathname: string, courseId: string | null): boolean {
  return (
    pathname.startsWith(MASTER_EDITOR_PATH_PREFIX) &&
    !!courseId &&
    isMasterCourseId(courseId)
  );
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const [mode, setMode] = useState<"loading" | "admin" | "certiano">("loading");
  const [serviceError, setServiceError] = useState<string | null>(null);

  const checkAuth = useCallback(() => {
    setServiceError(null);
    const masterEditorPath = isSuperuserMasterEditorPath(pathname, courseId);

    fetchAuthMe().then((result) => {
      if (result.status === "unavailable") {
        setServiceError(result.message);
        return;
      }

      if (result.status !== "ok") {
        window.location.replace(masterEditorPath ? "/certiano/login" : "/login");
        return;
      }

      if (result.user.role === "superuser" && masterEditorPath) {
        setMode("certiano");
        return;
      }

      setMode("admin");
    });
  }, [pathname, courseId]);

  useEffect(() => {
    setMode("loading");
    checkAuth();
  }, [checkAuth]);

  if (serviceError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-sm text-slate-600">{serviceError}</p>
        <Button type="button" onClick={checkAuth}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (mode === "loading") {
    return <LoadingStatus />;
  }

  if (mode === "certiano") {
    return <CertianoShell>{children}</CertianoShell>;
  }

  return <AdminShell>{children}</AdminShell>;
}

/** Admin-Shell; Superuser bearbeiten Master-Inhalte unter /dashboard/inhalte mit Certiano-Shell. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingStatus />}>
      <DashboardShellInner>{children}</DashboardShellInner>
    </Suspense>
  );
}
