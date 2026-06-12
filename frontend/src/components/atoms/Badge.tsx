interface BadgeProps {
  children: React.ReactNode;
  pulse?: boolean;
}

export default function Badge({ children, pulse = false }: BadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-[var(--badge-bg)] border border-[var(--badge-bd)] rounded-full px-[18px] py-2 text-sm font-semibold text-[var(--badge-text)]">
      {pulse && (
        <span className="animate-pulse w-2 h-2 rounded-full bg-[var(--badge-dot)] flex-shrink-0 inline-block" />
      )}
      {children}
    </div>
  );
}
