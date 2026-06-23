# Reuse lavish-axi's transport layer untouched; build only the structure layer on top

lavish-axi cleanly separates a **transport layer** (CLI, detached background server, session store, long-poll `poll` API with `--agent-reply`, SSE presence, the injected artifact SDK with `queuePrompt`/`data-lavish-question`, annotation of elements and text ranges, live reload, layout audit) from a **content-guidance layer** (the prompt text in `skill.js`/`playbooks.js`/`design-reference.js`).

Loupe keeps the transport layer essentially as-is — it is mature, handles the human↔agent feedback loop we need (including the round-trip that powers the two-pass flow and the post-Vision annotation loop), and rewriting it would be pure waste. All Loupe-specific work lives in a new structure layer on top: the scaffold generator (ADR-0001), the Grill Card / before-after / Lens-Gate components built on the existing SDK primitives, and Loupe's own guidance replacing lavish's.

The explicit no — _we do not rewrite transport_ — is the valuable part: it stops a future contributor from "starting clean" and rebuilding the long-poll/SSE/session machinery that already works. Recorded because it is the architectural shape of the fork and a reader would otherwise wonder how much of lavish survives.
