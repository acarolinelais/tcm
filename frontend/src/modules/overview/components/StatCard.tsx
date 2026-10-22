interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  iconBg?: string;
}

export function StatCard({ icon, label, value, iconBg = "bg-[#EAF1FF]" }: StatCardProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D2D6F3] ${iconBg}`}
      >
        <img src={icon} alt="" className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
