import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Stage 6 test suite. Runs against the real dev database (see
// tests/setup.ts) rather than mocking Prisma — matching this codebase's
// established "use real data" testing convention. Only genuinely external
// side effects (Stripe network calls, outbound automation email/webhook
// sends) are mocked per-test; everything that touches Postgres is real.
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Real "server-only" throws unconditionally when required outside
      // Next's webpack (see tests/stubs/server-only.ts) — swap in a no-op.
      "server-only": path.resolve(dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Integration tests share one Postgres database and clean up their own
    // rows — running them in parallel workers risks one test's cleanup
    // racing another's fixtures. Sequential keeps this suite deterministic.
    fileParallelism: false,
  },
});
