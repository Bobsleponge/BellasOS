'use client';

export function Panel({
  title,
  subtitle,
  children,
  span = 1,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  span?: 1 | 2 | 3;
}) {
  const spanClass =
    span === 3 ? 'xl:col-span-3' : span === 2 ? 'xl:col-span-2' : '';
  return (
    <section className={`panel glow p-4 flex flex-col ${spanClass}`}>
      <header className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-accent tracking-wide uppercase">
          {title}
        </h2>
        {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
      </header>
      <div className="flex-1 min-h-0 text-sm">{children}</div>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold text-white">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
