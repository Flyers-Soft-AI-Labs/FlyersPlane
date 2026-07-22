#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const buildTargets = ["admin...", "web..."];

const buildEnv = {
  ...process.env,
  VITE_API_BASE_URL: "https://flyersplane.onrender.com",
  VITE_API_BASE_PATH: "",
  VITE_ADMIN_BASE_URL: "",
  VITE_ADMIN_BASE_PATH: "/god-mode",
  NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=4096"].filter(Boolean).join(" "),
};

function runPnpm(args) {
  return process.platform === "win32"
    ? spawnSync(`${pnpm} ${args.join(" ")}`, {
        cwd: root,
        env: buildEnv,
        shell: true,
        stdio: "inherit",
      })
    : spawnSync(pnpm, args, {
        cwd: root,
        env: buildEnv,
        stdio: "inherit",
      });
}

for (const target of buildTargets) {
  const build = runPnpm(["--filter", target, "build"]);

  if (build.status !== 0) {
    if (build.error) console.error(build.error);
    process.exit(build.status ?? 1);
  }
}

const adminBuild = resolve(root, "apps/admin/build/client");
const webBuild = resolve(root, "apps/web/build/client");
const adminTarget = resolve(webBuild, "god-mode");

if (!existsSync(adminBuild)) {
  throw new Error(`Admin build output not found: ${adminBuild}`);
}

if (!existsSync(webBuild)) {
  throw new Error(`Web build output not found: ${webBuild}`);
}

rmSync(adminTarget, { recursive: true, force: true });
mkdirSync(adminTarget, { recursive: true });
cpSync(adminBuild, adminTarget, { recursive: true });

console.log(`Copied admin build to ${adminTarget}`);
