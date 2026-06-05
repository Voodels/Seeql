"use client"

import { useState, useEffect, useCallback } from "react"

export function useTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored === "dark" || (!stored && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      localStorage.setItem("theme", next ? "dark" : "light")
      document.documentElement.classList.toggle("dark", next)
      return next
    })
  }, [])

  return { dark, toggle }
}
