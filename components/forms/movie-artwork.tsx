import type { ReactNode } from "react"

export function MoviePiece({
  kind,
  className = "",
}: {
  kind: "popcorn" | "tickets" | "clapper"
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={`movie-piece ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="#302423" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        {kind === "popcorn" && (
          <>
            <path
              d="M38 63c-12-8-9-24 3-27-4-15 15-25 25-14 8-17 28-13 31 0 16-8 29 8 22 20 15 5 17 20 5 28Z"
              fill="#f1cd76"
            />
            <path d="M48 38q8-8 14 0m20-9q9 0 10 9m13 12q9-6 14 2" stroke="#ba944c" />
            <path d="m36 62 15 78h61l15-78Z" fill="#fff7e6" />
            <path d="m48 64 12 75h13l-7-75m23 0-2 75h14l9-75" fill="#a2393b" stroke="none" />
            <path d="m36 62 15 78h61l15-78Z" />
            <ellipse cx="81" cy="98" rx="23" ry="18" fill="#fff7e6" />
            <path d="m73 95 0 3m15-3v3m-15 7q7 6 14 0" />
            <path d="m23 38-7-7m121 15 9-4" />
          </>
        )}
        {kind === "tickets" && (
          <>
            <g transform="rotate(-12 75 80)">
              <path d="M14 39h124v22c-13 0-13 20 0 20v26H14V81c13 0 13-20 0-20Z" fill="#a2393b" />
              <path d="M105 44v58" stroke="#f7e7ce" strokeDasharray="3 5" />
            </g>
            <g transform="rotate(9 82 94)">
              <path d="M19 65h124v22c-13 0-13 20 0 20v26H19v-26c13 0 13-20 0-20Z" fill="#f1cd76" />
              <path d="M112 70v58" strokeDasharray="3 5" />
              <path d="m65 82 4 9 10 1-8 7 2 10-8-5-9 5 2-10-8-7 11-1Z" fill="#a2393b" stroke="none" />
              <path d="M120 83h12m-12 7h12m-12 23h12" strokeWidth="1.5" />
            </g>
          </>
        )}
        {kind === "clapper" && (
          <>
            <rect x="25" y="63" width="111" height="70" rx="6" fill="#fff7e6" />
            <path d="M25 63h111v20H25Z" fill="#302423" />
            <path d="m40 64-10 18m38-18L57 82m38-18L84 82m38-18-11 18" stroke="#fff7e6" strokeWidth="9" />
            <g transform="rotate(-14 25 64)">
              <rect
                x="25"
                y="43"
                width="111"
                height="21"
                rx="3"
                fill="#fff7e6"
                stroke="#fff7e6"
                strokeWidth="7"
              />
              <rect x="25" y="43" width="111" height="21" rx="3" fill="#302423" />
              <path d="m39 44 10 18m18-18 10 18m18-18 10 18m18-18 10 18" stroke="#fff7e6" strokeWidth="9" />
            </g>
            <path d="M40 99h81m-81 13h43" stroke="#a2393b" strokeWidth="2" />
            <circle cx="31" cy="69" r="2" fill="#f1cd76" stroke="none" />
          </>
        )}
      </g>
    </svg>
  )
}
export function MovieFormHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string | null
  children?: ReactNode
}) {
  return (
    <header className="game-heading movie-heading">
      <div className="game-heading-copy">
        <p className="game-eyebrow">UZBEKSOC / MOVIE NIGHT</p>
        <h1>{title}</h1>
        {description && <p className="game-description">{description}</p>}
      </div>
      <MoviePiece kind="popcorn" className="movie-mobile-piece" />
      {children}
    </header>
  )
}
export function MovieStatusCard({
  status,
  title,
  description,
  children,
}: {
  status: "success" | "full" | "closed" | "loading"
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <section
      className={`game-status movie-status movie-status-${status}`}
      aria-live="polite"
      aria-busy={status === "loading"}
    >
      <MoviePiece kind={status === "success" ? "tickets" : "clapper"} />
      <p className="game-eyebrow">
        {status === "success"
          ? "REGISTRATION RECEIVED"
          : status === "full"
            ? "REGISTRATION FULL"
            : status === "closed"
              ? "REGISTRATION CLOSED"
              : "LOADING FORM"}
      </p>
      <h1>{title}</h1>
      <p>
        {description ||
          (status === "success"
            ? "Thanks for joining us. Your response has been saved."
            : status === "full"
              ? "This screening’s registration limit has been reached. Please check back if more places become available."
              : status === "closed"
                ? "Registration isn’t open right now. Please check back later."
                : "Getting the registration form ready…")}
      </p>
      {children}
    </section>
  )
}
