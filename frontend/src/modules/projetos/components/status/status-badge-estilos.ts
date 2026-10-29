import { Check, Clock, Eye, Play, ShieldCheck, Wrench, X, type LucideIcon } from "lucide-react";

import type { StatusCasoTeste } from "../../model/projeto";

export const statusBadges: Record<StatusCasoTeste, { badge: string; icon: string; Icon: LucideIcon }> = {
  "To-Do": { badge: "bg-status-todo-bg text-status-todo-fg", icon: "bg-status-todo-icon", Icon: Clock },
  InProgress: { badge: "bg-status-progress-bg text-status-progress-fg", icon: "bg-status-progress-icon", Icon: Play },
  InReview: { badge: "bg-status-review-bg text-status-review-fg", icon: "bg-status-review-icon", Icon: Eye },
  InValidation: { badge: "bg-status-validation-bg text-status-validation-fg", icon: "bg-status-validation-icon", Icon: ShieldCheck },
  Done: { badge: "bg-status-done-bg text-status-done-fg", icon: "bg-status-done-icon", Icon: Check },
  InFixes: { badge: "bg-status-fixes-bg text-status-fixes-fg", icon: "bg-status-fixes-icon", Icon: Wrench },
  Cancelled: { badge: "bg-status-cancelled-bg text-status-cancelled-fg", icon: "bg-status-cancelled-icon", Icon: X },
};
export const statusBadgeBase = "h-7 w-fit gap-1.5 rounded-full border-0 px-2 py-0 text-sm font-medium shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
