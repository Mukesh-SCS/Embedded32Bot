import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, test } from "vitest";
import { healthBody, healthHandler } from "../src/health.js";

describe("health endpoint", () => {
  test("returns the service payload", () => {
    expect(healthBody()).toEqual({ status: "ok", service: "Embedded32Bot" });
  });

  test("handles GET /health", () => {
    const req = new IncomingMessage(new Socket());
    req.method = "GET";
    req.url = "/health";
    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    res.write = (chunk: unknown) => {
      chunks.push(Buffer.from(String(chunk)));
      return true;
    };
    res.end = (chunk?: unknown) => {
      if (chunk) {
        chunks.push(Buffer.from(String(chunk)));
      }
      res.emit("finish");
      return res;
    };

    expect(healthHandler(req, res)).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(Buffer.concat(chunks).toString()).toBe(JSON.stringify(healthBody()));
  });

  test("ignores other paths", () => {
    const req = new IncomingMessage(new Socket());
    req.method = "GET";
    req.url = "/ping";
    const res = new ServerResponse(req);
    expect(healthHandler(req, res)).toBe(false);
  });
});
