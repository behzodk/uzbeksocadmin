"use client"

import { useEffect, useRef, useState, useId } from "react"

/** Snow stays behind the reading surface and never receives pointer events. */
export function WinterScene() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [paused, setPaused] = useState(false)
  const id = useId().replace(/:/g, "")
  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext("2d")
    if (!el || !ctx) return
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0, last = 0, width = 0, height = 0
    let flakes: {x:number;y:number;r:number;speed:number;phase:number}[] = []
    const resize = () => {
      width = el.clientWidth; height = el.clientHeight
      const ratio = Math.min(devicePixelRatio || 1, 2)
      el.width = width * ratio; el.height = height * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      flakes = Array.from({length: width < 600 ? 38 : 100}, () => ({x:Math.random()*width,y:Math.random()*height,r:.6+Math.random()*2.5,speed:12+Math.random()*28,phase:Math.random()*Math.PI*2}))
    }
    const draw = (time:number) => {
      const dt = Math.min((time-last)/1000 || 0, .04); last = time
      ctx.clearRect(0,0,width,height)
      for (const f of flakes) {
        f.y += f.speed*dt; f.x += Math.sin(time/3000+f.phase)*9*dt
        if(f.y>height+5) {f.y=-5;f.x=Math.random()*width}
        ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(255,255,255,${.3+f.r*.16})`;ctx.fill()
      }
      frame=requestAnimationFrame(draw)
    }
    const sync = () => {cancelAnimationFrame(frame);last=0; if(!paused&&!motion.matches&&!document.hidden) frame=requestAnimationFrame(draw); else ctx.clearRect(0,0,width,height)}
    const observer=new ResizeObserver(resize);observer.observe(el)
    resize();sync()
    motion.addEventListener("change",sync);document.addEventListener("visibilitychange",sync)
    return () => {cancelAnimationFrame(frame);observer.disconnect();motion.removeEventListener("change",sync);document.removeEventListener("visibilitychange",sync)}
  }, [paused])
  return <>
    <div className="winter-scene" aria-hidden="true" data-paused={paused}>
      <canvas ref={canvas} className="winter-snow" />
      {[false,true].map((right)=><svg key={String(right)} className={`winter-bough ${right?"winter-bough-right":""}`} viewBox="0 0 340 500" fill="none">
        <defs>
          <radialGradient id={`${id}-glass-${right}`} cx=".3" cy=".25"><stop stopColor="#fff8dc"/><stop offset=".25" stopColor="#d5ba7e"/><stop offset=".7" stopColor="#8f7043"/><stop offset="1" stopColor="#4f4739"/></radialGradient>
          <radialGradient id={`${id}-blue-${right}`} cx=".3" cy=".25"><stop stopColor="#d9edf0"/><stop offset=".35" stopColor="#698f9b"/><stop offset="1" stopColor="#244653"/></radialGradient>
        </defs>
        <path d="M-20 0 Q100 60 275 120 M0 12 Q60 140 90 250" stroke="#314f49" strokeWidth="5"/>
        {Array.from({length:24},(_,i)=>{const x=i*12,y=20+i*4;return <g key={i} stroke={i%3===0?"#a5bcb1":"#42665c"} strokeWidth="2" strokeLinecap="round"><path d={`M${x} ${y} l-30 -40 M${x} ${y} l-35 20 M${x} ${y} l-12 -40 M${x} ${y} l-12 30`}/></g>})}
        {Array.from({length:16},(_,i)=><path key={i} d={`M${i*5} ${40+i*12} l-35 -20 m35 20 l25 -32 m-25 32 l-30 6`} stroke={i%3===0?"#bed0c5":"#52766a"} strokeWidth="2"/>)}
        <g className="winter-ornament"><path d="M190 90V245" stroke="#c9b582"/><rect x="182" y="241" width="16" height="10" rx="3" fill="#c5ac72"/><circle cx="190" cy="283" r="35" fill={`url(#${id}-glass-${right})`}/><path d="M167 267Q170 257 182 256" stroke="#fff9e9" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round"/></g>
        <g className="winter-ornament winter-ornament-small"><path d="M80 160V345" stroke="#c9b582"/><rect x="73" y="340" width="14" height="9" rx="2" fill="#bda573"/><circle cx="80" cy="374" r="28" fill={`url(#${id}-blue-${right})`}/><path d="M62 363Q65 354 73 353" stroke="#e4f6f5" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round"/></g>
        <path d="M240 110v60m0 0 6 15 16 1-12 10 4 16-14-9-14 9 4-16-12-10 16-1Z" stroke="#d6bb7e" fill="#d6bb7e"/>
        {[35,95,145,215,270].map((x,i)=><g key={x} className="winter-light" style={{animationDelay:`-${i*1.3}s`}}><circle cx={x} cy={35+x*.3} r="10" fill="#f9dda0" opacity=".12"/><circle cx={x} cy={35+x*.3} r="3" fill="#ffe9b3"/></g>)}
      </svg>)}
    </div>
    <button type="button" className="winter-motion" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?"Resume snowfall":"Pause snowfall"}</button>
  </>
}
