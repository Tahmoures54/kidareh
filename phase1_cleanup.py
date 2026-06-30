#!/usr/bin/env python3
"""
Phase 1: Security & Repository Cleanup Script (Fixed for Windows)
Run this from your project ROOT directory (where .git/ is located).
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime


def run_cmd(cmd_parts, check=True):
    """Run a shell command given as a list of strings (fixes Windows quote issues)."""
    print(f"\n▶ {' '.join(cmd_parts)}")
    result = subprocess.run(
        cmd_parts, 
        check=check, 
        capture_output=True, 
        text=True,
        encoding='utf-8',
        errors='replace'
    )
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr and result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
    return result


def main():
    root = Path.cwd()
    git_dir = root / ".git"

    # ─── 1. Safety Checks ───────────────────────────────────────────
    if not git_dir.exists():
        print("❌ Error: No .git folder found. Run this script from the project root.")
        sys.exit(1)

    print(f"✅ Project root detected: {root.resolve()}")

    # ─── 2. Backup .git before rewriting history ────────────────────
    backup_name = f".git_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_path = root / backup_name
    
    print(f"\n📦 Creating backup of .git folder to: {backup_name}/")
    try:
        # Ignore large pack files or locks to speed up backup
        shutil.copytree(git_dir, backup_path, ignore=shutil.ignore_patterns("*.lock"))
        print(f"✅ Backup created successfully.")
    except Exception as e:
        print(f"⚠️ Could not create backup: {e}")
        sys.exit(1)

    # ─── 3. Purge sensitive files/dirs from Git history ─────────────
    targets = [
        ".env",
        ".env.local",
        "app.db",
        "app.db-shm",
        "app.db-wal",
        "logs",
        "uploads",
        "public/uploads",
        "npm"  # the 0-byte zombie file
    ]

    # Build the internal bash command string for filter-branch
    # Because we pass this as a list to subprocess, Windows CMD won't mangle the quotes!
    rm_cmd_string = "git rm -r --cached --ignore-unmatch " + " ".join(targets)

    print("\n🧹 Rewriting Git history to remove sensitive files...")
    print("   (This may take a few seconds depending on repo size)")
    
    filter_cmd_parts = [
        "git", "filter-branch", "--force",
        "--index-filter", rm_cmd_string,
        "--prune-empty", "--tag-name-filter", "cat",
        "--", "--all"
    ]
    
    result = run_cmd(filter_cmd_parts, check=False)
    if result.returncode != 0:
        print("\n⚠️ filter-branch reported an error.")
        print("   If you already ran it once, you need to restore from the backup folder first.")
        sys.exit(1)

    # ─── 4. Clean up orphaned refs & optimize repo ──────────────────
    print("\n🗑️ Cleaning up orphaned refs and running garbage collection...")
    refs_original = root / ".git" / "refs" / "original"
    if refs_original.exists():
        shutil.rmtree(refs_original)

    run_cmd(["git", "reflog", "expire", "--expire=now", "--all"], check=False)
    run_cmd(["git", "gc", "--prune=now", "--aggressive"], check=False)

    # ─── 5. Untrack files in current working directory ───────────────
    # IMPORTANT: This REMOVES them from Git tracking, but does NOT delete them from your hard drive!
    print("\n🧽 Removing sensitive files from Git tracking (keeping local files intact)...")
    run_cmd(["git", "rm", "-r", "--cached", "--ignore-unmatch"] + targets, check=False)
    
    # Only delete the useless zombie file from disk
    npm_file = root / "npm"
    if npm_file.exists():
        npm_file.unlink()
        print("   🗑️  Deleted zombie file: npm")

    # ─── 6. Harden .gitignore ───────────────────────────────────────
    gitignore = root / ".gitignore"
    required_rules = [
        "# === Security & Runtime (Phase 1) ===",
        ".env",
        ".env.local",
        ".env.*.local",
        "*.db",
        "*.db-shm",
        "*.db-wal",
        "logs/",
        "uploads/",
        "public/uploads/",
        "node_modules/",
        "dist/",
        "coverage/",
    ]

    existing = gitignore.read_text(encoding="utf-8") if gitignore.exists() else ""
    additions = [r for r in required_rules if r not in existing]

    if additions:
        with open(gitignore, "a", encoding="utf-8") as f:
            if existing and not existing.endswith("\n"):
                f.write("\n")
            f.write("\n".join(additions) + "\n")
        print(f"\n✅ Updated .gitignore with {len(additions)} new rules.")
    else:
        print("\nℹ️ .gitignore already contains required rules.")

    # ─── 7. Create Zod env validator (TypeScript) ───────────────────
    config_dir = root / "src" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    env_ts = config_dir / "env.ts"

    env_ts_content = '''import { z } from "zod";

/**
 * Runtime environment validation.
 * The app will refuse to start if any required variable is missing or invalid.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars long"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  // Payment gateways (uncomment when needed):
  // PAYMENT_API_KEY: z.string().min(1),
  // ZARINPAL_MERCHANT_ID: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\\n❌ Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`   → ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
'''
    if not env_ts.exists():
        env_ts.write_text(env_ts_content, encoding="utf-8")
        print(f"✅ Created {env_ts}")
    else:
        print(f"ℹ️ {env_ts} already exists. Skipping.")

    # ─── 8. Create .env.example template ────────────────────────────
    env_example = root / ".env.example"
    example_content = '''# Copy this file to .env and fill with real values (NEVER commit .env)
NODE_ENV=development
PORT=3000
DATABASE_URL=./app.db
JWT_SECRET=replace_with_a_random_32_character_string
CORS_ORIGIN=http://localhost:5173
# PAYMENT_API_KEY=your_key_here
# ZARINPAL_MERCHANT_ID=your_merchant_id
'''
    if not env_example.exists():
        env_example.write_text(example_content, encoding="utf-8")
        print(f"✅ Created {env_example}")

    # ─── 9. Install Zod ──────────────────────────────────────────────
    print("\n📦 Installing required package: zod...")
    run_cmd(["npm", "install", "zod"], check=False)

    # ─── 10. Create clean commit ─────────────────────────────────────
    print("\n📝 Creating a clean commit for the removed files...")
    run_cmd(["git", "add", ".gitignore"], check=False)
    run_cmd(["git", "add", "src/config/env.ts"], check=False)
    run_cmd(["git", "add", ".env.example"], check=False)
    run_cmd(["git", "commit", "-m", "chore: phase 1 - cleanup sensitive files and add env validation", "--allow-empty"], check=False)

    # ─── 11. Final Report ────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("🎉 PHASE 1 CLEANUP COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print(f"""
Backup location: {backup_path.name}/

What changed:
  • Purged .env, DB files, logs, uploads from Git history
  • Removed 0-byte 'npm' file from working directory
  • Untracked sensitive files (Your local .env and app.db are SAFE on disk)
  • Hardened .gitignore
  • Created src/config/env.ts (Zod validator)
  • Created .env.example template
  • Installed Zod package

⚠️  IMPORTANT NEXT STEPS:
─────────────────────────────────────────────────────────────
1. In your server.ts, import the validated env:
      import { env } from "./src/config/env";
   Then replace process.env.PORT with env.PORT, etc.

2. If you have a remote (GitHub/GitLab), FORCE PUSH carefully:
      git push origin --force --all
   (This rewrites history. Inform teammates to re-clone.)

3. Store your REAL .env file in a password manager, NOT in the repo.
─────────────────────────────────────────────────────────────
""")


if __name__ == "__main__":
    main()