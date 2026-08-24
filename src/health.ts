import type { IncomingMessage, ServerResponse } from "node:http";
import { SERVICE_NAME } from "./config.js";

export const HEALTH_PATH = "/health";

export type HealthResponse = {
  status: "ok";
  service: typeof SERVICE_NAME;
};

export function healthBody(): HealthResponse {
  return { status: "ok", service: SERVICE_NAME };
}

export function healthHandler(req: IncomingMessage, res: ServerResponse): boolean {
  const path = req.url?.split("?")[0] ?? "";
  if (req.method !== "GET" || path !== HEALTH_PATH) {
    return false;
  }

  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(healthBody()));
  return true;
}
