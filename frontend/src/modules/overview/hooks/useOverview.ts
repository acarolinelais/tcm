import { useQuery } from "@tanstack/react-query";

import { overviewApi } from "../api/overview.api";

export function useOverview() {
  return useQuery({ queryKey: ["overview"], queryFn: overviewApi.obter });
}
