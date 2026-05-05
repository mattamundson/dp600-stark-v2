// Static, dependency-free SVG diagram of a Fabric deployment pipeline:
// three stages (Dev, Test, Prod), forward deploy arrows, a dashed
// backward-deploy arrow (Prod -> Test), per-stage rule indicators,
// permission callouts, and an item-type compatibility note.
//
// Pure presentational. Inherits surrounding theme via `currentColor` and
// Tailwind utility classes — the parent panel sets foreground / muted
// tokens.

export function PipelineDiagram() {
  return (
    <div className="w-full max-w-[700px]">
      <svg
        viewBox="0 0 700 360"
        role="img"
        aria-label="Fabric deployment pipeline overview"
        className="h-auto w-full text-[currentColor]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Fabric deployment pipeline overview</title>
        <desc>
          Three-stage Fabric deployment pipeline showing forward deploy from
          Development to Test to Production, an optional dashed backward
          deploy from Production back to Test, target-stage rule bindings,
          required permissions, and supported item types.
        </desc>

        <defs>
          {/* Forward arrowhead (uses currentColor so it picks up theme text) */}
          <marker
            id="pdg-arrow-forward"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
          {/* Backward arrowhead, drawn with the warn color via class on the path */}
          <marker
            id="pdg-arrow-backward"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M0,0 L10,5 L0,10 z"
              className="fill-amber-500 dark:fill-amber-400"
            />
          </marker>
        </defs>

        {/* ── Stage boxes ───────────────────────────────────────────── */}
        {/* Development */}
        <g>
          <rect
            x="20"
            y="80"
            width="180"
            height="120"
            rx="14"
            ry="14"
            className="fill-sky-50 stroke-sky-400 dark:fill-sky-950/40 dark:stroke-sky-500"
            strokeWidth={1.5}
          />
          <text
            x="110"
            y="112"
            textAnchor="middle"
            className="fill-current text-[15px] font-semibold"
          >
            Development
          </text>
          <text
            x="110"
            y="138"
            textAnchor="middle"
            className="fill-current/70 text-[11px]"
          >
            Authoring workspace
          </text>
          <text
            x="110"
            y="170"
            textAnchor="middle"
            className="fill-current/60 text-[10px]"
          >
            Rules: connection / parameter
          </text>
          <text
            x="110"
            y="186"
            textAnchor="middle"
            className="fill-current/60 text-[10px]"
          >
            (target-side; usually none on Dev)
          </text>
        </g>

        {/* Test */}
        <g>
          <rect
            x="260"
            y="80"
            width="180"
            height="120"
            rx="14"
            ry="14"
            className="fill-violet-50 stroke-violet-400 dark:fill-violet-950/40 dark:stroke-violet-500"
            strokeWidth={1.5}
          />
          <text
            x="350"
            y="112"
            textAnchor="middle"
            className="fill-current text-[15px] font-semibold"
          >
            Test
          </text>
          <text
            x="350"
            y="138"
            textAnchor="middle"
            className="fill-current/70 text-[11px]"
          >
            Validation workspace
          </text>
          <text
            x="350"
            y="170"
            textAnchor="middle"
            className="fill-current/60 text-[10px]"
          >
            Rules: connection / parameter
          </text>
          <text
            x="350"
            y="186"
            textAnchor="middle"
            className="fill-current/60 text-[10px]"
          >
            (rebinds Dev sources to Test)
          </text>
        </g>

        {/* Production */}
        <g>
          <rect
            x="500"
            y="80"
            width="180"
            height="120"
            rx="14"
            ry="14"
            className="fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-500"
            strokeWidth={1.5}
          />
          <text
            x="590"
            y="112"
            textAnchor="middle"
            className="fill-current text-[15px] font-semibold"
          >
            Production
          </text>
          <text
            x="590"
            y="138"
            textAnchor="middle"
            className="fill-current/70 text-[11px]"
          >
            Live workspace
          </text>
          <text
            x="590"
            y="170"
            textAnchor="middle"
            className="fill-current/60 text-[10px]"
          >
            Rules: connection / parameter
          </text>
          <text
            x="590"
            y="186"
            textAnchor="middle"
            className="fill-current/60 text-[10px]"
          >
            (rebinds to Prod sources)
          </text>
        </g>

        {/* ── Forward deploy arrows ────────────────────────────────── */}
        {/* Dev -> Test */}
        <line
          x1="200"
          y1="130"
          x2="260"
          y2="130"
          stroke="currentColor"
          strokeWidth={2}
          markerEnd="url(#pdg-arrow-forward)"
        />
        <text
          x="230"
          y="120"
          textAnchor="middle"
          className="fill-current text-[10px] font-semibold"
        >
          Deploy
        </text>

        {/* Test -> Prod */}
        <line
          x1="440"
          y1="130"
          x2="500"
          y2="130"
          stroke="currentColor"
          strokeWidth={2}
          markerEnd="url(#pdg-arrow-forward)"
        />
        <text
          x="470"
          y="120"
          textAnchor="middle"
          className="fill-current text-[10px] font-semibold"
        >
          Deploy
        </text>

        {/* ── Backward deploy: Prod -> Test (dashed, amber) ───────── */}
        <path
          d="M 500 165 C 470 235, 410 235, 380 195"
          fill="none"
          strokeDasharray="6 4"
          strokeWidth={2}
          markerEnd="url(#pdg-arrow-backward)"
          className="stroke-amber-500 dark:stroke-amber-400"
        />
        <text
          x="440"
          y="232"
          textAnchor="middle"
          className="fill-amber-700 text-[10px] font-semibold dark:fill-amber-400"
        >
          Backward deploy (debug / hotfix sync)
        </text>

        {/* ── Permission callout ──────────────────────────────────── */}
        <g>
          <rect
            x="20"
            y="252"
            width="320"
            height="52"
            rx="10"
            ry="10"
            className="fill-current/[0.04] stroke-current/30"
            strokeWidth={1}
          />
          <text
            x="36"
            y="272"
            className="fill-current text-[11px] font-semibold"
          >
            Deploy permission
          </text>
          <text x="36" y="290" className="fill-current/80 text-[10.5px]">
            Member on SOURCE stage + Contributor on TARGET stage
          </text>
        </g>

        {/* ── Item type compatibility callout ─────────────────────── */}
        <g>
          <rect
            x="360"
            y="252"
            width="320"
            height="52"
            rx="10"
            ry="10"
            className="fill-current/[0.04] stroke-current/30"
            strokeWidth={1}
          />
          <text
            x="376"
            y="272"
            className="fill-current text-[11px] font-semibold"
          >
            Item type compatibility
          </text>
          <text x="376" y="290" className="fill-current/80 text-[10.5px]">
            Dataflow Gen2 supported | Gen1 NOT supported
          </text>
        </g>

        {/* ── Footnote: stage count locked at creation ────────────── */}
        <text
          x="350"
          y="332"
          textAnchor="middle"
          className="fill-current/70 text-[10.5px] italic"
        >
          Stage count is fixed at pipeline creation and cannot be changed afterward.
        </text>
      </svg>
    </div>
  );
}
