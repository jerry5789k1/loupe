# Post-vision annotations are triaged into three grades

After the Goal Vision is drawn, the developer reviews by annotating the artifact (lavish's element /
text-range annotations, reused unchanged). Not all annotations carry the same weight, so treating
them uniformly is wrong — a wording tweak and "this whole change is misguided" need different
responses. The agent grades each annotation into one of three:

- **Tweak** — local or cosmetic (wording, a wrong arrow direction, a color, a mislabeled node). The
  agent patches the HTML in place and replies briefly. No gate involvement.
- **Follow-up** — a question or request for more detail ("why doesn't X happen?", "show the error
  path"). The agent answers by adjusting the relevant section (a note, an extra branch) within the
  current lens, and replies.
- **Directional** — challenges the agreed product intent or the premise of the change ("we shouldn't
  force this", "the real problem is Y"). The agent does **not** silently redraw. It surfaces the
  finding and asks the developer to confirm reopening the product intent (the reverse gate, ADR-0004)
  before the Code Lens is invalidated. It proceeds only on explicit consent.

The agent states the grade it assigned when it responds, so the developer can correct a mis-triage.

Why record it: the grading is a deliberate protocol (not obvious — the default is to treat all
feedback the same), and the directional → consent rule is what stops a stray annotation from silently
unwinding an agreed change. The grading itself is agent judgment over free-form annotations; the
structure Loupe guarantees is this protocol plus the existing consent control, not a new UI on top of
lavish's annotation surface (ADR-0002).
