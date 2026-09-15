/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, httpSubscriptionLink, splitLink } from "@trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@proyecta/api/router";
import { currentLanguage } from "./i18n.js";
import { createRefreshLink } from "./refreshLink.js";
import { session } from "./session.js";

export const trpc = createTRPCReact<AppRouter>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;

async function refresh(refreshToken: string) {
  const response = await fetch("/trpc/auth.refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) throw new Error("refresh failed");
  const body = (await response.json()) as {
    result: { data: { accessToken: string; refreshToken: string } };
  };
  return body.result.data;
}

export function createClient() {
  return trpc.createClient({
    links: [
      createRefreshLink(session, refresh),
      splitLink({
        condition: (op) => op.type === "subscription",
        // Event streams can't carry headers: auth travels as connection params.
        true: httpSubscriptionLink({
          url: "/trpc",
          connectionParams: () => {
            const current = session.get();
            return { token: current?.accessToken ?? "", workspace: current?.workspace ?? "" };
          }
        }),
        false: httpBatchLink({
          url: "/trpc",
          headers: () => {
            const current = session.get();
            return {
              // API messages (field and domain errors) come back in the dashboard's language.
              "x-language": currentLanguage(),
              ...(current ? { authorization: `Bearer ${current.accessToken}` } : {}),
              ...(current?.workspace ? { "x-workspace": current.workspace } : {})
            };
          }
        })
      })
    ]
  });
}
