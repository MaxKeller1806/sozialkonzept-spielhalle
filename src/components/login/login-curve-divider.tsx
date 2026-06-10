/**
 * Geschwungener Übergang am rechten Rand des Branding-Bereichs.
 * Ein großer weißer Kreisbogen schneidet sanft in den Login-Bereich.
 */
export function LoginCurveDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute right-0 top-1/2 z-30 hidden aspect-square rounded-full bg-white lg:block ${className}`}
      style={{
        width: "min(128vh, 860px)",
        height: "min(128vh, 860px)",
        transform: "translate(71%, -50%)",
      }}
      aria-hidden="true"
    />
  );
}
