/**
 * Stops a stale Next.js dev lock (if any), clears .next, and starts `next dev`.
 * Use when Turbopack cache is corrupt or "Another next dev server is already running".
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, ".next", "dev", "lock");

function killPid(pid) {
  if (!pid || Number.isNaN(pid)) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
    } else {
      process.kill(pid, "SIGTERM");
    }
    console.log(`Stopped stale dev server (PID ${pid})`);
  } catch {
    /* process may already be gone */
  }
}

if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    killPid(lock.pid);
  } catch {
    /* ignore malformed lock */
  }
}

try {
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
  console.log("Cleared .next cache");
} catch {
  /* ok if missing */
}

const child = spawn("npx", ["next", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
