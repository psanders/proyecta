/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { trpc } from "./trpc.js";
import { useSession } from "./useSession.js";

/** Subscribes once per business to screen status changes and patches cached list and detail queries. */
export function useLiveStatus() {
  const current = useSession();
  const utils = trpc.useUtils();

  trpc.screens.onStatus.useSubscription(undefined, {
    enabled: !!current?.workspace,
    onData(event) {
      for (const archived of [false, true]) {
        utils.screens.list.setData({ archived }, (list) => {
          if (!list) return list;
          const screens = list.screens.map((s) =>
            s.id === event.screenId ? { ...s, status: event.status } : s
          );
          const active = archived
            ? list.totals.online
            : screens.filter((s) => s.status === "ONLINE").length;
          return { ...list, screens, totals: { ...list.totals, online: active } };
        });
      }
      utils.screens.get.setData({ id: event.screenId }, (screen) =>
        screen ? { ...screen, status: event.status } : screen
      );
      // Health/last activity come from the server: refresh the detail quietly.
      void utils.screens.get.invalidate({ id: event.screenId });
    }
  });
}
