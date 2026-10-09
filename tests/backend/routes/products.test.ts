// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import productsRouter from "../../../server/routes/products";

const app = express();
app.use(express.json());
app.use("/api/products", productsRouter);

let server: ReturnType<typeof app.listen>;
let baseUrl = "";

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

describe("Products API", () => {
  it("returns a JSON product list", async () => {
    const response = await fetch(`${baseUrl}/api/products`);
    expect(response.headers.get("content-type")).toMatch(/json/);
    expect(response.status).toBe(200);

    const body: unknown = await response.json();
    expect(body).toHaveProperty("products");
    expect(Array.isArray((body as { products?: unknown }).products)).toBe(true);
  });

  it("does not allow anonymous product creation", async () => {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "محصول آزمایشی",
        price: 500000,
        description: "توضیحات آزمایشی",
      }),
    });

    expect([401, 403]).toContain(response.status);
  });
});
