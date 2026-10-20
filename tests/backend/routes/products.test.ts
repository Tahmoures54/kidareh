import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import express from "express";

describe("Products API integration", () => {
  let server: Server;
  let baseUrl: string;
  let databasePath: string;
  let closeDatabase: (() => void) | undefined;

  beforeAll(async () => {
    // The server modules read configuration during import, so configure an isolated
    // SQLite database before importing the router.
    databasePath = path.join(process.cwd(), "data", `products-test-${process.pid}.sqlite`);
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    for (const suffix of ["", "-shm", "-wal"]) {
      try { fs.unlinkSync(databasePath + suffix); } catch { /* file does not exist */ }
    }

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = databasePath;
    process.env.JWT_SECRET = "test-only-jwt-secret-value";
    process.env.COOKIE_SECRET = "test-only-cookie-secret-value";
    process.env.REDIS_ENABLED = "false";
    vi.resetModules();

    const [{ default: productsRouter }, database] = await Promise.all([
      import("../../../server/routes/products.js"),
      import("../../../server/db.js"),
    ]);
    closeDatabase = () => database.closeDatabaseSafely();

    const app = express();
    app.use(express.json());
    app.use("/api/products", productsRouter);
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
    closeDatabase?.();
    if (databasePath) {
      for (const suffix of ["", "-shm", "-wal"]) {
        try { fs.unlinkSync(databasePath + suffix); } catch { /* file does not exist */ }
      }
    }
  });

  it("returns an empty, paginated result for a valid public product listing", async () => {
    const response = await fetch(`${baseUrl}/api/products?scope=all&page=1&limit=5`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      products: [],
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    });
  });

  it("does not require authentication to browse public products", async () => {
    const response = await fetch(`${baseUrl}/api/products/?scope=all`);
    expect(response.status).toBe(200);
    expect((await response.json()).products).toEqual([]);
  });
});
