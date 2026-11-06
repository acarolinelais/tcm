import { httpGet } from "@/core/api/http-client";

import type { OverviewData } from "../model/overview";

export const overviewApi = {
  obter: () => httpGet<OverviewData>("/api/overview"),
};
