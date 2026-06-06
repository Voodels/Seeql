"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

const VB = 32
const MAX_OFF = 1.0

interface SeeqlLogoProps {
  className?: string
  size?: number
}

const tween = { type: "tween" as const, duration: 0.45, times: [0, 0.15, 0.3, 1], ease: "easeInOut" as const }

export function SeeqlLogo({ className = "", size = 32 }: SeeqlLogoProps) {
  const ref = useRef<SVGSVGElement>(null)
  const [scared, setScared] = useState(false)
  const scaredRef = useRef(false)

  const lx = useMotionValue(0); const ly = useMotionValue(0)
  const rx = useMotionValue(0); const ry = useMotionValue(0)
  const slx = useSpring(lx, { stiffness: 200, damping: 20 })
  const sly = useSpring(ly, { stiffness: 200, damping: 20 })
  const srx = useSpring(rx, { stiffness: 200, damping: 20 })
  const sry = useSpring(ry, { stiffness: 200, damping: 20 })

  useEffect(() => {
    const svg = ref.current
    if (!svg) return

    const onMove = (e: MouseEvent) => {
      if (scaredRef.current) return
      const r = svg.getBoundingClientRect()
      const s = VB / size
      const vx = (e.clientX - r.left) * s
      const vy = (e.clientY - r.top) * s

      const aL = Math.atan2(vy - 12, vx - 12)
      lx.set(Math.cos(aL) * MAX_OFF)
      ly.set(Math.sin(aL) * MAX_OFF)

      const aR = Math.atan2(vy - 12, vx - 20)
      rx.set(Math.cos(aR) * MAX_OFF)
      ry.set(Math.sin(aR) * MAX_OFF)
    }

    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [size, lx, ly, rx, ry])

  return (
    <motion.svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} text-primary`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => { scaredRef.current = true; setScared(true) }}
      onMouseLeave={() => { scaredRef.current = false; setScared(false) }}
    >
      {/* Database cylinder */}
      <motion.path
        d="M6 10 C6 7 26 7 26 10 L26 24 C26 27 6 27 6 24 Z"
        className="fill-primary/10 stroke-primary"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />

      {/* Top ellipse */}
      <motion.ellipse
        cx="16"
        cy="10"
        rx="10"
        ry="3"
        className="fill-primary/10 stroke-primary"
        strokeWidth="1.2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ originX: "16px", originY: "10px" }}
      />

      {/* Left eye */}
      <motion.ellipse
        cx="12"
        cy="12"
        rx="2.6"
        ry="2"
        className="fill-background stroke-primary/30"
        strokeWidth="0.5"
        animate={
          scared
            ? { scaleY: [1, 0.6, 0.6, 0], x: [0, -2, 2, 0], opacity: [1, 1, 1, 0] }
            : { scaleY: 1, x: 0, opacity: 1 }
        }
        transition={tween}
        style={{ originY: "12px" }}
      />
      <motion.circle
        cx={12}
        cy={12}
        r="1"
        className="fill-primary"
        style={{ x: slx, y: sly }}
        animate={
          scared
            ? { scale: [1, 1.8, 1.8, 0], opacity: [1, 1, 0, 0] }
            : { scale: 1, opacity: 1 }
        }
        transition={tween}
      />

      {/* Right eye */}
      <motion.ellipse
        cx="20"
        cy="12"
        rx="2.6"
        ry="2"
        className="fill-background stroke-primary/30"
        strokeWidth="0.5"
        animate={
          scared
            ? { scaleY: [1, 0.6, 0.6, 0], x: [0, 2, -2, 0], opacity: [1, 1, 1, 0] }
            : { scaleY: 1, x: 0, opacity: 1 }
        }
        transition={tween}
        style={{ originY: "12px" }}
      />
      <motion.circle
        cx={20}
        cy={12}
        r="1"
        className="fill-primary"
        style={{ x: srx, y: sry }}
        animate={
          scared
            ? { scale: [1, 1.8, 1.8, 0], opacity: [1, 1, 0, 0] }
            : { scale: 1, opacity: 1 }
        }
        transition={tween}
      />

      {/* Brackets */}
      <text x="3.5" y="10" textAnchor="end" className="fill-primary font-mono" fontSize="7" fontWeight="bold">
        {"["}
      </text>
      <text x="28.5" y="10" textAnchor="start" className="fill-primary font-mono" fontSize="7" fontWeight="bold">
        {"]"}
      </text>
    </motion.svg>
  )
}

export function SeeqlWordmark({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <SeeqlLogo size={28} />
      <motion.span
        className="font-heading text-lg font-bold tracking-tight"
        initial={{ letterSpacing: -2 }}
        animate={{ letterSpacing: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Seeql
      </motion.span>
      <motion.span
        className="text-[10px] font-mono text-muted-foreground/50 -ml-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        SQL Visualizer
      </motion.span>
    </motion.div>
  )
}
