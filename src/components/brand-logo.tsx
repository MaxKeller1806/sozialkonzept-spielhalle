import type { ImgHTMLAttributes } from "react";

export type BrandLogoVariant =
  | "sidebar-expanded"
  | "sidebar-collapsed"
  | "login"
  | "preview-sidebar"
  | "preview-collapsed"
  | "preview-box";

/** Feste Container, object-contain – Logo vollständig sichtbar, kein Beschneiden. */
const VARIANT_FRAME: Record<BrandLogoVariant, string> = {
  "sidebar-expanded": "flex h-12 w-full max-w-[228px] items-center justify-start",
  "sidebar-collapsed": "flex h-10 w-10 shrink-0 items-center justify-center",
  login: "flex h-20 w-full max-w-[360px] items-center justify-center",
  "preview-sidebar": "flex h-12 w-full items-center justify-start",
  "preview-collapsed": "flex h-10 w-10 shrink-0 items-center justify-center",
  "preview-box":
    "flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white",
};

type BrandLogoProps = {
  src: string;
  alt?: string;
  variant?: BrandLogoVariant;
  className?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

export function BrandLogo({
  src,
  alt = "",
  variant = "sidebar-expanded",
  className = "",
  ...props
}: BrandLogoProps) {
  return (
    <div
      className={`${VARIANT_FRAME[variant]} ${className}`.trim()}
      aria-hidden={alt === "" ? true : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="block max-h-full max-w-full object-contain"
        decoding="async"
        {...props}
      />
    </div>
  );
}
