"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { APP_NAME } from "@/lib/branding";
import { BrandingProvider } from "@/components/branding-provider";
import { DEFAULT_BRANDING } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";

interface OperatorBrandingState {
  name: string;
  branding: CompanyBranding;
}

const CertianoBrandingContext = createContext<OperatorBrandingState>({
  name: APP_NAME,
  branding: DEFAULT_BRANDING,
});

let operatorBrandingCache: OperatorBrandingState | null | undefined;
let operatorBrandingFetch: Promise<OperatorBrandingState | null> | null = null;

export function invalidateOperatorBrandingCache(): void {
  operatorBrandingCache = undefined;
  operatorBrandingFetch = null;
}

function loadOperatorBranding(): Promise<OperatorBrandingState | null> {
  if (operatorBrandingCache !== undefined) {
    return Promise.resolve(operatorBrandingCache);
  }
  if (!operatorBrandingFetch) {
    operatorBrandingFetch = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        let res = await fetch("/api/superuser/operator-branding", {
          signal: controller.signal,
        });
        if (res.status === 401 || res.status === 403) {
          res = await fetch("/api/public/operator-branding", { signal: controller.signal });
        }
        if (!res.ok) {
          const fallback = { name: APP_NAME, branding: DEFAULT_BRANDING };
          operatorBrandingCache = fallback;
          return fallback;
        }
        const d = await res.json();
        if (!d?.branding) {
          const fallback = { name: APP_NAME, branding: DEFAULT_BRANDING };
          operatorBrandingCache = fallback;
          return fallback;
        }
        const data: OperatorBrandingState = {
          name: String(d.name ?? APP_NAME),
          branding: d.branding as CompanyBranding,
        };
        operatorBrandingCache = data;
        return data;
      } catch {
        const fallback = { name: APP_NAME, branding: DEFAULT_BRANDING };
        operatorBrandingCache = fallback;
        return fallback;
      } finally {
        window.clearTimeout(timeout);
        operatorBrandingFetch = null;
      }
    })();
  }
  return operatorBrandingFetch;
}

export function useCertianoBranding(): OperatorBrandingState {
  return useContext(CertianoBrandingContext);
}

export function CertianoBrandingLoader({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OperatorBrandingState>(
    operatorBrandingCache ?? { name: APP_NAME, branding: DEFAULT_BRANDING }
  );

  useEffect(() => {
    let cancelled = false;
    loadOperatorBranding().then((d) => {
      if (!cancelled && d) setState(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onBrandingUpdated(e: Event) {
      const detail = (e as CustomEvent<OperatorBrandingState>).detail;
      if (!detail?.branding) return;
      operatorBrandingCache = detail;
      setState(detail);
    }
    window.addEventListener("certiano-branding-updated", onBrandingUpdated);
    return () => window.removeEventListener("certiano-branding-updated", onBrandingUpdated);
  }, []);

  return (
    <CertianoBrandingContext.Provider value={state}>
      <BrandingProvider branding={state.branding}>{children}</BrandingProvider>
    </CertianoBrandingContext.Provider>
  );
}

export function notifyCertianoBrandingUpdated(state: OperatorBrandingState): void {
  if (typeof window === "undefined") return;
  operatorBrandingCache = state;
  window.dispatchEvent(new CustomEvent("certiano-branding-updated", { detail: state }));
}
