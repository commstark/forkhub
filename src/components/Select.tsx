"use client"

import { useState, useRef, useEffect } from "react"

type Option = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  align?: "left" | "right"
}

export default function Select({ value, onChange, options, placeholder, align = "left" }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--bg-input)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--r-input)",
          padding: "7px 10px",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          color: value ? "var(--text-primary)" : "var(--text-muted)",
          cursor: "pointer",
          transition: "border-color var(--t), box-shadow var(--t)",
          outline: "none",
          whiteSpace: "nowrap",
          ...(open ? { borderColor: "var(--accent, #c2724f)", boxShadow: "0 0 0 3px var(--accent-dim, rgba(194,114,79,0.15))" } : {}),
        }}
      >
        <span>{selected?.label ?? placeholder ?? "Select…"}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{
            color: "var(--text-secondary)",
            flexShrink: 0,
            transition: "transform 150ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            zIndex: 200,
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--r-card)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)",
            minWidth: 180,
            overflow: "hidden",
            animation: "fade-in 120ms ease forwards",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: isSelected ? 500 : 400,
                  textAlign: "left",
                  transition: "background var(--t)",
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)" }}
                onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.background = "none" }}
              >
                <span style={{ width: 14, flexShrink: 0, color: "var(--text-1)" }}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
