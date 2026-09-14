/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Incremental parser for text/event-stream bodies read with fetch (EventSource can't send an
 * Authorization header). Feed decoded chunks; complete messages are returned, partial ones kept.
 * Comment lines (": keep-alive") are ignored.
 */
export function createSseParser() {
  let buffer = "";
  return (chunk: string): SseMessage[] => {
    buffer += chunk.replace(/\r\n/g, "\n");
    const messages: SseMessage[] = [];
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith(":")) continue;
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length > 0) messages.push({ event, data: data.join("\n") });
      boundary = buffer.indexOf("\n\n");
    }
    return messages;
  };
}
