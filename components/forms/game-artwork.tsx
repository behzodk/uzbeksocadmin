import type { ReactNode } from "react"

/** Original tabletop illustrations. Decorative and deliberately outside the input flow. */
export function GamePiece({ kind, className = "" }: { kind: "dice" | "cards" | "pawn"; className?: string }) {
  return (
    <svg
      viewBox="0 0 140 150"
      fill="none"
      className={`game-piece ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {kind === "dice" && (
        <g stroke="#262622" strokeWidth="2.5" strokeLinejoin="round">
          <g transform="rotate(12 81 87)">
            <rect x="43" y="48" width="75" height="75" rx="17" fill="#e6503d" />
            <path d="M53 111h44c7 0 10-4 10-11V58" opacity=".25" />
            <g fill="#fffdf6" stroke="none">
              <circle cx="62" cy="67" r="5" />
              <circle cx="99" cy="67" r="5" />
              <circle cx="80" cy="86" r="5" />
              <circle cx="62" cy="105" r="5" />
              <circle cx="99" cy="105" r="5" />
            </g>
          </g>
          <g transform="rotate(-14 48 55)">
            <rect x="14" y="21" width="68" height="68" rx="16" fill="#fffdf6" />
            <g fill="#262622" stroke="none">
              <circle cx="33" cy="40" r="5" />
              <circle cx="63" cy="40" r="5" />
              <circle cx="33" cy="70" r="5" />
              <circle cx="63" cy="70" r="5" />
            </g>
          </g>
          <path d="m111 24 3-9m6 17 10-2M14 115l-5 6" strokeLinecap="round" />
        </g>
      )}
      {kind === "cards" && (
        <g stroke="#262622" strokeWidth="2.5" strokeLinejoin="round">
          <g transform="rotate(-14 51 77)">
            <rect x="13" y="21" width="72" height="107" rx="9" fill="#3158cf" />
            <rect x="21" y="29" width="56" height="91" rx="5" stroke="#fffdf6" strokeWidth="1.5" />
            <path d="m49 48 17 26-17 27-17-27Z" fill="#fffdf6" stroke="none" />
          </g>
          <g transform="rotate(11 88 81)">
            <rect x="49" y="25" width="72" height="107" rx="9" fill="#fffdf6" />
            <path d="M85 67c-13-15-28 5 0 25 28-20 13-40 0-25Z" fill="#e6503d" stroke="none" />
            <path
              d="m59 45 5-10 5 10m-8-3h6m43 70-5 10-5-10m8 3h-6"
              stroke="#e6503d"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </g>
      )}
      {kind === "pawn" && (
        <g stroke="#262622" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          <path
            d="M45 93c9-8 13-18 14-28-12-6-15-26-3-36 10-9 27-8 36 1 12 13 7 31-5 36 1 11 5 20 13 27l4 18H41Z"
            fill="#edbd46"
          />
          <rect x="31" y="109" width="83" height="20" rx="9" fill="#edbd46" />
          <path d="m49 92 43 0M67 47v3m13-3v3m-12 9q6 5 11-1" />
          <path d="m110 35 5-8m0 18 10-1M25 72l-8-4" />
        </g>
      )}
    </svg>
  )
}

export function GameFormHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string | null
  children?: ReactNode
}) {
  return (
    <header className="game-heading">
      <div className="game-heading-copy">
        <p className="game-eyebrow">
          <span className="game-mini-pips" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>{" "}
          UZBEKSOC · GAME NIGHT
        </p>
        <h1>{title}</h1>
        {description && <p className="game-description">{description}</p>}
      </div>
      <GamePiece kind="dice" className="game-mobile-piece" />
      {children}
    </header>
  )
}

export function GameStatusCard({
  status,
  title,
  description,
  children,
}: {
  description?: string
  status: "success" | "closed" | "full" | "loading"
  title: string
  children?: ReactNode
}) {
  return (
    <section
      className={`game-status game-status-${status}`}
      aria-live="polite"
      aria-busy={status === "loading"}
    >
      <GamePiece kind={status === "success" ? "pawn" : "cards"} />
      <p className="game-eyebrow">
        {status === "success"
          ? "REGISTRATION RECEIVED"
          : status === "full"
            ? "REGISTRATION FULL"
            : status === "loading"
              ? "LOADING FORM"
              : "REGISTRATION CLOSED"}
      </p>
      <h1>{title}</h1>
      <p>
        {description ||
          (status === "success"
            ? "Thanks for signing up. Your response has been saved."
            : status === "full"
              ? "This form has reached its response limit. Please check back if more places become available."
              : status === "loading"
                ? "Getting everything ready…"
                : "This form isn’t accepting responses right now. Please check back later.")}
      </p>
      {children}
    </section>
  )
}
