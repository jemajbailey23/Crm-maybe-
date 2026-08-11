// Vitest doesn't auto-load .env the way `next dev`/`next build` do, so the
// real DATABASE_URL (and anything else in .env) has to be loaded explicitly
// before any test imports `@/lib/prisma`.
import { config } from "dotenv";
config();
