import type { ReactNode } from "react"
import "./form-theme.css"

export type FormTheme = "standard" | "game" | "new-year"
export function FormThemeFrame({ theme, children }: { theme?: string; children: ReactNode }) {
  const selected = theme === "game" || theme === "new-year" ? theme : "standard"
  return <div className="form-theme" data-form-theme={selected}>
    {selected !== "standard" && <div className="theme-prologue" aria-hidden="true">
      <span className="theme-edition">UZBEK SOCIETY / {selected === "game" ? "AFTER HOURS" : "A NEW CHAPTER"}</span>
      <div className="theme-stickers">
        {selected === "game" ? <><span className="theme-die"><i/><i/><i/><i/></span><span className="theme-card">A<span>♠</span></span><span className="theme-seal">YOUR<br/>MOVE.</span></> : <><span className="theme-orbit"/><span className="theme-spark">✳</span><span className="theme-seal">HERE’S TO<br/>WHAT’S NEXT.</span></>}
      </div>
      <p className="theme-caption">{selected === "game" ? "Good company. A little friendly competition." : "An evening to remember. A year to look forward to."}</p>
    </div>}
    <div className="theme-content">{children}</div>
  </div>
}
