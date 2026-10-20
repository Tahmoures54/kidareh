import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { default as DbType } from "better-sqlite3";

describe("SQLite backup and restore smoke test", () => {
  let databasePath: string;
  let backupPath = "";
  let db: DbType;
  let createBackup: () => Promise<string>;
  let closeDatabaseSafely: () => Promise<void>;
  let testPhone: string;

  beforeAll(async () => {
    databasePath = path.join(process.cwd(), "data", `backup-test-${process.pid}.sqlite`);
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    for (const suffix of ["", "-shm", "-wal"]) {
      try { fs.unlinkSync(databasePath + suffix); } catch { /* file does not exist */ }
    }

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = databasePath;
    process.env.JWT_SECRET = "test-only-jwt-secret-value";
    process.env.COOKIE_SECRET = "test-only-cookie-secret-value";
    process.env.REDIS_ENABLED = "false";
    process.env.BACKUP_ON_SHUTDOWN = "false";

    const database = await import("../../server/db.js");
    db = database.default;
    createBackup = database.createBackup;
    closeDatabaseSafely = database.closeDatabaseSafely;
    testPhone = `09${String(Date.now()).slice(-9)}`;
    db.prepare("INSERT INTO users (phone, role, name) VALUES (?, 'buyer', ?)").run(testPhone, "Backup Restore Test");
  }, 30_000);

  afterAll(async () => {
    await closeDatabaseSafely?.();
    if (backupPath) {
      try { fs.unlinkSync(backupPath); } catch { /* already removed */ }
    }
    if (databasePath) {
      for (const suffix of ["", "-shm", "-wal"]) {
        try { fs.unlinkSync(databasePath + suffix); } catch { /* file does not exist */ }
      }
      const backupDir = path.join(path.dirname(databasePath), "backups");
      try {
        for (const file of fs.readdirSync(backupDir)) {
          if (file.startsWith("backup-") && file.endsWith(".db")) fs.unlinkSync(path.join(backupDir, file));
        }
        fs.rmdirSync(backupDir);
      } catch { /* directory may contain files from another process */ }
    }
  });

  it("creates a consistent backup that can be reopened and queried", async () => {
    backupPath = await createBackup();
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(path.dirname(backupPath)).toBe(path.join(path.dirname(databasePath), "backups"));

    const restored = new Database(backupPath, { readonly: true, fileMustExist: true });
    try {
      expect(restored.pragma("integrity_check")).toEqual([{ integrity_check: "ok" }]);
      const user = restored.prepare("SELECT phone, name FROM users WHERE phone = ?").get(testPhone) as
        | { phone: string; name: string }
        | undefined;
      expect(user).toEqual({ phone: testPhone, name: "Backup Restore Test" });
    } finally {
      restored.close();
    }
  });
});
