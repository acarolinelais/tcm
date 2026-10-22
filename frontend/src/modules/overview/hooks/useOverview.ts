import { useQuery } from "@tanstack/react-query";

import { useMock } from "@/core/config";

import { overviewApi } from "../api/overview.api";
import { fetchOverviewMock } from "../api/overview.mock";

export function useOverview() {
  return useQuery({
    queryKey: ["overview", useMock],
    queryFn: useMock ? fetchOverviewMock : overviewApi.obter,
  });
}
