export function FieldInfo({ label, description }: { label: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
    </div>
  );
}
