# Two lenses (Product, Code) with a Gate between them

A change has two truths a developer must review: what it means for the user, and what it means
for the code. Loupe makes both first-class as **Lenses**. The Product Lens (use cases, UX) is
reviewed first; the Code Lens (architecture, interfaces) second. Between them sits a **hard Gate**:
the Code Lens is generated only after the developer locks the product intent.

Why gate at all rather than showing both at once: architecture that is not derived from an agreed
product change is just the agent guessing — the bullet-list-of-nouns failure mode Loupe exists to
remove. Locking the product intent gives the Code Lens a fixed basis, and grounds its §A "current
architecture" in the _real codebase_ (or, for a greenfield project, an explicit from-scratch
proposal).

**The gate is a _soft_ signal, not a UI lock (revised).** The first implementation shipped the Code
Lens behind a blocking lock overlay (blur + `pointer-events: none`). That was wrong: it stopped the
developer from annotating or editing the Code Lens, which violates the rule that **the HTML artifact
is the source of truth and must stay freely editable and annotatable** — nothing in a Loupe artifact
may block editing or annotation. So the lock overlay was removed. The gate now means only: the agent
leaves the Code Lens empty until the `Lock product intent` button fires `PRODUCT INTENT LOCKED`
(and `reopen` fires `REOPEN PRODUCT INTENT`) through the existing queuePrompt round-trip. The ordering
is enforced by the _agent's workflow_, not by disabling the UI. The Code Lens is always visible,
editable, and annotatable.

The gate is not a one-way street, but passing it in reverse is a **consented** action: a
`Reopen product intent` control tells the agent to re-grill the Product Lens, so a stray code-lens
annotation can never silently overturn the agreed product change.

`loupe new --product-only` drops the Gate and Code Lens for small changes that need no architecture
review (this was the whole of v1).

Recorded because it is the core shape of the review flow, the gate is a deliberate, non-obvious
constraint, and it is hard to reverse once agents and artifacts depend on the two-lens structure.
