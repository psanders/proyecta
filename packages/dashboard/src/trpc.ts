/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@proyecta/api/router";

export const trpc = createTRPCReact<AppRouter>();
