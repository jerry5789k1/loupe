# Greenfield mode reshapes the Code Lens for from-scratch design

For a brand-new project there is no codebase, so the Code Lens's brownfield framing — "Current
Architecture" with a Blast Radius and an architecture **before → after** — is meaningless: there is
no "before" and nothing to disturb. Forcing it makes the agent invent a fake "current" state.

`loupe new --greenfield` reshapes the Code Lens accordingly (the Product Lens is unchanged — a new
product still replaces some current way of doing things):

- §A becomes **Proposed Architecture** (the modules/interfaces to build), with the core new pieces
  marked `class … new` instead of a `hit` blast radius.
- §C drops the before/after diagram for a flat **Interfaces & contracts** list (everything is new to
  add).
- The companion spec's Code Lens section switches to "from scratch / Grounded in: greenfield".

The mode is an explicit flag, and the scaffold records it as `data-loupe-greenfield` on the root so
`loupe spec` detects it without guessing. Brownfield stays the default because most changes touch
existing code.

Recorded because greenfield is a distinct shape of the Code Lens (not just different prose), the
before/after-vs-from-scratch distinction is a real modeling decision, and a reader would otherwise
expect every Code Lens to have a "before".
