// Stand-in for the "server-only" marker package. Next.js aliases real
// imports of "server-only" to a no-op during its own webpack build (it only
// throws if a server-only module leaks into a *client* bundle); outside
// Next's bundler — i.e. under Vitest — that aliasing doesn't happen and the
// package isn't even installed, so this stub (wired in via vitest.config.ts)
// stands in for it instead.
export {};
