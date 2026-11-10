import type { RouteObject } from "react-router";

import { BugReportsPage } from "./pages/BugReportsPage";

export const bugReportsRoutes: RouteObject[] = [{ path: "bug-reports", element: <BugReportsPage /> }];
