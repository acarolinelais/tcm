import type { RouteObject } from "react-router";

import { OverviewPage } from "./pages/OverviewPage";

export const overviewRoutes: RouteObject[] = [{ path: "overview", element: <OverviewPage /> }];
