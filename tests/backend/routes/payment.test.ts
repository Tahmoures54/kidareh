import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import express from "express";

describe("Payment API security integration", () => {
  let server: Server;
  let baseUrl: string;
  let databasePath: string;
  let closeDatabase: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    databasePath = path.join(process.cwd(), "data", `payment-test-${process.pid}.sqlite`);
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    for (const suffix of ["", "-shm", "-wal"]) {
      try { fs.unlinkSync(databasePath + suffix); } catch { /* file does not exist */ }
    }

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = databasePath;
    process.env.JWT_SECRET = "test-only-jwt-secret-value";
    process.env.COOKIE_SECRET = "test-only-cookie-secret-value";
    process.env.REDIS_ENABLED = "false";
    delete process.env.ZIBAL_MERCHANT;
    vi.resetModules();

    const [{ default: paymentRouter }, database] = await Promise.all([
      import("../../../server/routes/payment.js"),
      import("../../../server/db.js"),
    ]);
    closeDatabase = database.closeDatabaseSafely;

    const app = express();
    app.use(express.json());
    app.use("/api/payment", paymentRouter);
    server = await new Promise<Server>((resolve, reject) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
      instance.once("error", reject);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 30_000);

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await closeDatabase?.();
    if (databasePath) {
      for (const suffix of ["", "-shm", "-wal"]) {
        try { fs.unlinkSync(databasePath + suffix); } catch { /* file does not exist */ }
      }
    }
  });

  it("rejects unauthenticated payment initiation", async () => {
    const response = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        returnUrl: "https://example.test/payment/callback",
        items: [{ badgeId: "blue_tick_30d", qty: 1 }],
      }),
    });

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated payment verification", async () => {
    const response = await fetch(`${baseUrl}/api/payment/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trackId: "12345", transactionId: 1 }),
    });

    expect(response.status).toBe(401);
  });
});
