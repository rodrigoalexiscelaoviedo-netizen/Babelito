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
