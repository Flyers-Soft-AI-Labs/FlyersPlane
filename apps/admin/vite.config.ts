import path from "node:path";
import * as dotenv from "dotenv";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { joinUrlPath } from "@plane/utils";

dotenv.config({ path: path.resolve(__dirname, ".env") });

// Expose only vars starting with VITE_
const viteEnv = Object.keys(process.env)
  .filter((k) => k.startsWith("VITE_"))
  .reduce<Record<string, string>>((a, k) => {
    a[k] = process.env[k] ?? "";
    return a;
  }, {});

const basePath = joinUrlPath(process.env.VITE_ADMIN_BASE_PATH ?? "", "/") ?? "/";

export default defineConfig(() => ({
  base: basePath,
  define: {
    "process.env": JSON.stringify(viteEnv),
  },
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [reactRouter(), tsconfigPaths({ projects: [path.resolve(__dirname, "tsconfig.json")] })],
  optimizeDeps: {
    // admin depends on several workspace:* packages (@plane/ui, @plane/propel, @plane/utils,
    // @plane/services, @plane/hooks, @plane/types, @plane/constants). Vite doesn't pre-bundle
    // linked workspace packages - it crawls them as source, and discovers their transitive
    // dependencies in batches as different routes are visited. Each batch triggers a
    // re-optimize *and* a full page reload, which crawls deeper and finds more, producing a
    // slow chain of "new dependencies optimized ... reloading" cycles on a cold Vite cache.
    // This list is the full set of those transitive deps, gathered by clearing
    // node_modules/.vite and visiting every admin route until no more were discovered. It is
    // NOT redundant with package.json: most of these are not direct dependencies of admin at
    // all, they only exist so Vite can pre-bundle them up front instead of finding them one
    // reload at a time. If you add a new workspace-package import that pulls in a fresh
    // dependency, clear node_modules/.vite and re-run this same process to extend the list.
    include: [
      "next-themes",
      "swr",
      "mobx-react",
      "@bprogress/core",
      "react-hook-form",
      "lucide-react",
      "lodash-es",
      "uuid",
      "mobx",
      "axios",
      "file-type",
      "date-fns",
      "date-fns/differenceInCalendarDays",
      "clsx",
      "tailwind-merge",
      "rehype-parse",
      "rehype-remark",
      "remark-gfm",
      "remark-stringify",
      "unified",
      "chroma-js",
      "react-popper",
      "@headlessui/react",
      "react-color",
      "@radix-ui/react-scroll-area",
      "@atlaskit/pragmatic-drag-and-drop/dist/cjs/entry-point/element/adapter.js",
      "@atlaskit/pragmatic-drag-and-drop/dist/cjs/entry-point/combine.js",
      "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/cjs/closest-edge.js",
      "@blueprintjs/popover2",
      "class-variance-authority",
      "@base-ui-components/react/tooltip",
      "@base-ui-components/react/toast",
    ],
  },
  resolve: {
    alias: {
      // Next.js compatibility shims used within admin
      "next/link": path.resolve(__dirname, "app/compat/next/link.tsx"),
      "next/navigation": path.resolve(__dirname, "app/compat/next/navigation.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
  },
  // No SSR-specific overrides needed; alias resolves to ESM build
}));
