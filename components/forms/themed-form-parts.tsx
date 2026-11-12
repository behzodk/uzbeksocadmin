import type { ComponentProps } from "react"
import { GameFormHeader, GameStatusCard } from "./game-artwork"
import { MovieFormHeader, MovieStatusCard } from "./movie-artwork"
export function isIllustratedFormTheme(theme?: string) {
  return theme === "game" || theme === "movie"
}
export function ThemedFormHeader({
  theme,
  ...props
}: ComponentProps<typeof GameFormHeader> & { theme?: string }) {
  return theme === "movie" ? <MovieFormHeader {...props} /> : <GameFormHeader {...props} />
}
export function ThemedStatusCard({
  theme,
  ...props
}: ComponentProps<typeof GameStatusCard> & { theme?: string }) {
  return theme === "movie" ? <MovieStatusCard {...props} /> : <GameStatusCard {...props} />
}
