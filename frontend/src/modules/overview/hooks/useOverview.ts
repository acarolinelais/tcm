import { useQuery } from "@tanstack/react-query";

import { fetchOverviewMock } from "../api/overview.mock";

export function useOverview() {
  return useQuery({
    queryKey: ["overview", "mock"],
    queryFn: fetchOverviewMock,
  });
}
