# Clarity over polish: mermaid is the default diagram format, not hand-authored SVG

The fork's premise started as "keep lavish's interactivity but make it prettier, Apple-style." A side-by-side test reversed that: shown a hand-authored Apple-aesthetic SVG next to a plain mermaid diagram, the developer found mermaid markedly more readable and the polished SVG noisier and partly self-occluding. The decoration _increased_ cognitive load — the exact failure mode Loupe exists to remove.

So Loupe's governing aesthetic principle is **clarity over polish**: any visual element that does not increase understanding is removed. Concretely, the **default diagram format is mermaid** — restrained, consistent, legible, near-zero authoring cost. Blast Radius is expressed with mermaid `classDef` node coloring and `subgraph` grouping. Hand-authored SVG is an escape hatch, used only when mermaid genuinely cannot express a relationship and the developer asks for it, and even then it must stay equally restrained.

Recorded because it directly contradicts the fork's original stated goal (a reader will wonder why "make it prettier" became "use plain mermaid"), it shapes both the visual direction and the tooling dependency, and it was the result of a real, tested trade-off.
