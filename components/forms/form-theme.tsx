import type { ReactNode } from "react"
import { MoviePiece } from "./movie-artwork"
import { GamePiece } from "./game-artwork"
import "./form-theme.css"
import "./game-theme.css"
import "./movie-theme.css"

export type FormTheme = "standard" | "game" | "new-year" | "movie"
export function FormThemeFrame({ theme, children }: { theme?: string; children: ReactNode }) {
  const selected = theme === "game" || theme === "new-year" || theme === "movie" ? theme : "standard"
  return (
    <div className="form-theme" data-form-theme={selected}>
      {selected === "game" && (
        <div className="game-table-pieces" aria-hidden="true">
          <GamePiece kind="cards" className="game-cards" />
          <GamePiece kind="dice" className="game-dice" />
          <GamePiece kind="pawn" className="game-pawn" />
        </div>
      )}
      {selected === "movie" && (
        <div className="movie-margin-pieces" aria-hidden="true">
          <MoviePiece kind="popcorn" className="movie-popcorn" />
          <MoviePiece kind="clapper" className="movie-clapper" />
          <MoviePiece kind="tickets" className="movie-tickets" />
        </div>
      )}
      {selected === "new-year" && (
        <div className="theme-margin-art" aria-hidden="true">
          <span className="theme-orbit" />
          <span className="theme-spark">✳</span>
        </div>
      )}
      <div className="theme-content">{children}</div>
    </div>
  )
}
