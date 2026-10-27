import { Badge } from "@/shared/ui/badge";

export function FormFactorResultBadge({ value }: { value: string }) {
  const pass = value.toLocaleLowerCase() === "pass";
  const fail = value.toLocaleLowerCase() === "fail";
  if (!pass && !fail) return <>{value}</>;
  return <Badge variant="secondary" className={pass
    ? "border-0 bg-green-50 text-green-800"
    : "border-0 bg-red-50 text-red-800"}>{value}</Badge>;
}
