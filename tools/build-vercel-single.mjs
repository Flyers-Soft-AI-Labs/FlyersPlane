#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const buildArgs = ["turbo", "run", "build", "--filter=admin", "--filter=web"];

const buildEnv = {
  ...process.env,
  VITE_API_BASE_URL: "",
  VITE_API_BASE_PATH: "",
  VITE_ADMIN_BASE_URL: "",
  VITE_ADMIN_BASE_PATH: "/god-mode",
};

const build =
  process.platform === "win32"
    ? spawnSync(`${pnpm} ${buildArgs.join(" ")}`, {
        cwd: root,
        env: buildEnv,
        shell: true,
        stdio: "inherit",
      })
    : spawnSync(pnpm, buildArgs, {
        cwd: root,
        env: buildEnv,
        stdio: "inherit",
      });

if (build.status !== 0) {
  if (build.error) console.error(build.error);
  process.exit(build.status ?? 1);
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
