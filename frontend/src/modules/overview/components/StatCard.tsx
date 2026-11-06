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
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D2D6F3] ${iconBg}`}
      >
        <img src={icon} alt="" className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] leading-4 text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold leading-5 text-foreground">{value}</p>
      </div>
    </div>
  );
}
