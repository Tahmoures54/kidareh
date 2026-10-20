import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import type Database from "better-sqlite3";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));

describe("Payment API security and idempotency integration", () => {
  let server: Server;
  let baseUrl: string;
  let databasePath: string;
  let closeDatabase: (() => Promise<void>) | undefined;
  let db: Database.Database;
  let userId: number;
  let accessToken: string;

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
    db = database.default;
    closeDatabase = database.closeDatabaseSafely;

    const user = db.prepare("INSERT INTO users (phone, role, name) VALUES (?, 'seller', ?)").run("09120000001", "Payment Test");
    userId = Number(user.lastInsertRowid);
    accessToken = jwt.sign({ id: userId, phone: "09120000001", role: "seller" }, process.env.JWT_SECRET!);

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
        returnUrl: "http://localhost:3000/payment-callback",
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

  it("rejects an external payment callback URL before creating a transaction", async () => {
    const before = (db.prepare("SELECT COUNT(*) AS count FROM transactions").get() as { count: number }).count;
    const response = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        returnUrl: "https://attacker.example/payment-callback",
        items: [{ badgeId: "ارسال فوری", qty: 1 }],
      }),
    });

    expect(response.status).toBe(400);
    const after = (db.prepare("SELECT COUNT(*) AS count FROM transactions").get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it("rejects an invalid badge before creating a payment transaction", async () => {
    const before = (db.prepare("SELECT COUNT(*) AS count FROM transactions").get() as { count: number }).count;
    const response = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        returnUrl: "http://localhost:3000/payment-callback",
        items: [{ badgeId: "not-a-real-package", qty: 1 }],
      }),
    });

    expect(response.status).toBe(400);
    const after = (db.prepare("SELECT COUNT(*) AS count FROM transactions").get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it("grants a purchased item once and rejects duplicate development confirmation", async () => {
    const initiation = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        returnUrl: "http://localhost:3000/payment-callback",
        items: [{ badgeId: "ارسال فوری", qty: 1 }],
      }),
    });

    expect(initiation.status).toBe(200);
    const created = await initiation.json() as { transactionId: number; devMode?: boolean; amount: number };
    expect(created.devMode).toBe(true);
    expect(created.amount).toBe(10_000);

    const confirm = () => fetch(`${baseUrl}/api/payment/dev-confirm`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ transactionId: created.transactionId }),
    });
    const first = await confirm();
    expect(first.status).toBe(200);
    const second = await confirm();
    expect(second.status).toBe(200);

    const inventory = db.prepare("SELECT quantity FROM badge_inventory WHERE user_id = ? AND badge_name = ?")
      .get(userId, "ارسال فوری") as { quantity: number };
    expect(inventory.quantity).toBe(1);

    const transaction = db.prepare("SELECT status FROM transactions WHERE id = ?").get(created.transactionId) as { status: string };
    expect(transaction.status).toBe("success");
  });

  it("does not grant benefits for a mismatched Zibal amount, then verifies and grants exactly once", async () => {
    db.prepare("INSERT INTO settings (key, value, description) VALUES ('ZIBAL_MERCHANT', 'test-merchant', 'test') ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run();
    const metadata = JSON.stringify([{ badgeId: "تضمین کیفیت", qty: 1 }]);
    const inserted = db.prepare(
      "INSERT INTO transactions (user_id, amount, type, status, ref_id, metadata) VALUES (?, ?, 'badge_purchase', 'pending', ?, ?)"
    ).run(userId, 15_000, "987654321", metadata);
    const transactionId = Number(inserted.lastInsertRowid);
    const post = vi.mocked(axios.post);

    post.mockResolvedValueOnce({ data: { result: 100, amount: 149_999 } } as never);
    const verify = () => fetch(`${baseUrl}/api/payment/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ trackId: "987654321", transactionId }),
    });

    const mismatch = await verify();
    expect(mismatch.status).toBe(400);
    expect((db.prepare("SELECT status FROM transactions WHERE id = ?").get(transactionId) as { status: string }).status).toBe("pending");
    expect(db.prepare("SELECT quantity FROM badge_inventory WHERE user_id = ? AND badge_name = ?").get(userId, "تضمین کیفیت")).toBeUndefined();

    post.mockResolvedValueOnce({ data: { result: 100, amount: 150_000 } } as never);
    const success = await verify();
    expect(success.status).toBe(200);
    const inventory = db.prepare("SELECT quantity FROM badge_inventory WHERE user_id = ? AND badge_name = ?")
      .get(userId, "تضمین کیفیت") as { quantity: number };
    expect(inventory.quantity).toBe(1);

    const callsAfterSuccess = post.mock.calls.length;
    const replay = await verify();
    expect(replay.status).toBe(200);
    expect(post).toHaveBeenCalledTimes(callsAfterSuccess);
    expect((db.prepare("SELECT quantity FROM badge_inventory WHERE user_id = ? AND badge_name = ?")
      .get(userId, "تضمین کیفیت") as { quantity: number }).quantity).toBe(1);
  });

});
