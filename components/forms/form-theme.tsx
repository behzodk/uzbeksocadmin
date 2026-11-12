import type { ReactNode } from "react"
import "./form-theme.css"

export type FormTheme = "standard" | "game" | "new-year"
export function FormThemeFrame({ theme, children }: { theme?: string; children: ReactNode }) {
  const selected = theme === "game" || theme === "new-year" ? theme : "standard"
  return <div className="form-theme" data-form-theme={selected}>
    {selected !== "standard" && <div className="theme-margin-art" aria-hidden="true">
      {selected === "game" ? <><span className="theme-die"><i/><i/><i/><i/></span><span className="theme-card">A<span>♠</span></span></> : <><span className="theme-orbit"/><span className="theme-spark">✳</span></>}
    </div>}
    <div className="theme-content">{children}</div>
  </div>
}
