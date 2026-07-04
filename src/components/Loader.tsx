/** Full-page loader — orbe coral de la marca. */
export default function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-paper-muted">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-coral/40" />
        <span className="absolute inset-2 rounded-full bg-coral" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest">{label}</p>
    </div>
  );
}

/**
 * Inline brand loader — tres barras que pulsean en onda coral/mint/gold.
 * Reemplaza <Loader2 className="animate-spin" /> en contextos de espera inline.
 *
 * size="sm" → barras pequeñas para texto/botones (default)
 * size="md" → barras medianas para cards y spinners prominentes
 */
export function BrandDots({ size = "sm" }: { size?: "sm" | "md" }) {
  const barClass = size === "md" ? "h-5 w-1" : "h-3 w-0.5";
  const colors = ["bg-coral", "bg-mint", "bg-gold"];
  const delays = ["0ms", "200ms", "400ms"];

  return (
    <span className="inline-flex items-end gap-0.5" aria-label="Loading" role="status">
      {colors.map((c, i) => (
        <span
          key={i}
          className={`${barClass} rounded-full ${c} animate-wave-dot`}
          style={{ animationDelay: delays[i] }}
        />
      ))}
    </span>
  );
}
