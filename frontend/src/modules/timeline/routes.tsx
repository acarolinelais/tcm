import type { RouteObject } from "react-router";

import { TimelinePage } from "./pages/TimelinePage";

export const timelineRoutes: RouteObject[] = [{ path: "timeline", element: <TimelinePage /> }];
