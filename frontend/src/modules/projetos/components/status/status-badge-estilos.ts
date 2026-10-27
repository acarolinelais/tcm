import { Check, Clock, Eye, Play, ShieldCheck, X, type LucideIcon } from "lucide-react";

import type { StatusCasoTeste } from "../../model/projeto";

export const statusBadges: Record<StatusCasoTeste, { badge: string; icon: string; Icon: LucideIcon }> = {
  "To-Do": { badge: "bg-slate-100 text-slate-700", icon: "bg-slate-500", Icon: Clock },
  InProgress: { badge: "bg-blue-50 text-blue-800", icon: "bg-blue-700", Icon: Play },
  InReview: { badge: "bg-amber-50 text-amber-800", icon: "bg-amber-600", Icon: Eye },
  InValidation: { badge: "bg-violet-50 text-violet-800", icon: "bg-violet-600", Icon: ShieldCheck },
  Pass: { badge: "bg-green-50 text-green-800", icon: "bg-green-800", Icon: Check },
  Fail: { badge: "bg-red-50 text-red-800", icon: "bg-red-700", Icon: X },
};
export const statusBadgeBase = "h-7 w-fit gap-1.5 rounded-full border-0 px-2 py-0 text-sm font-medium shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
