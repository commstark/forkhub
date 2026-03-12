"use client"

import { useEffect, useRef } from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SecurityDocData = Record<string, any>

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === "object") return Object.keys(v as object).length === 0
  return false
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>—</span>
  }
  if (typeof value === "boolean") return String(value)
  if (typeof value === "number")  return String(value)
  if (typeof value === "string")  return value
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>None</span>
    return (
      <ul className="sdoc-list">
        {value.map((item, i) => <li key={i}>{renderValue(item)}</li>)}
      </ul>
    )
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => !isEmpty(v))
    if (entries.length === 0) return <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>—</span>
    return (
      <div className="sdoc-nested">
        {entries.map(([k, v]) => (
          <dl key={k} className="sdoc-nested-row">
            <dt>{k.replace(/_/g, " ")}:</dt>
            <dd>{renderValue(v)}</dd>
          </dl>
        ))}
      </div>
    )
  }
  return String(value)
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <dl className="sdoc-field">
      <dt>{label.replace(/_/g, " ")}</dt>
      <dd>
        {isEmpty(value)
          ? <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>Not yet provided</span>
          : renderValue(value)
        }
      </dd>
    </dl>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  if (!risk) return <span style={{ color: "var(--text-3)", fontSize: 11 }}>—</span>
  const cls = {
    low:      "risk-low",
    medium:   "risk-medium",
    high:     "risk-high",
    critical: "risk-critical",
  }[risk.toLowerCase()] ?? "risk-default"
  return <span className={`risk-badge ${cls}`}>{risk}</span>
}

function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    import("mermaid").then(async (m) => {
      m.default.initialize({ startOnLoad: false, theme: "default" })
      try {
        const { svg } = await m.default.render(`mermaid-${Date.now()}`, chart)
        if (ref.current) ref.current.innerHTML = svg
      } catch {
        if (ref.current) ref.current.innerHTML = `<pre style="font-size:12px;color:var(--text-2);padding:8px">${chart}</pre>`
      }
    })
  }, [chart])
  return <div ref={ref} className="card card-pad" style={{ overflow: "auto" }} />
}

function isMermaid(s: string) {
  const t = s.trim().toLowerCase()
  return t.startsWith("flowchart") || t.startsWith("graph") || t.startsWith("sequencediagram") || t.startsWith("erdiagram")
}

function renderList(items: unknown[]): React.ReactNode {
  if (!items || items.length === 0) return <span style={{ color: "var(--text-3)", fontStyle: "italic", fontSize: 13 }}>None listed</span>
  return (
    <ul className="sdoc-list">
      {items.map((item, i) => <li key={i}>{renderValue(item)}</li>)}
    </ul>
  )
}

function renderDataFlowSteps(steps: unknown[]): React.ReactNode {
  if (!steps || steps.length === 0) return null
  return (
    <div style={{ marginTop: 12 }}>
      {steps.map((step, i) => (
        <div key={i} className="sdoc-step">
          <span className="sdoc-step-num">{i + 1}</span>
          <div style={{ flex: 1, fontSize: 13, color: "var(--text-1)", paddingTop: 2 }}>{renderValue(step)}</div>
        </div>
      ))}
    </div>
  )
}

export default function SecurityDoc({ doc }: { doc: SecurityDocData }) {
  if (!doc || Object.keys(doc).length === 0) {
    return <p style={{ fontSize: 13, color: "var(--text-3)", fontStyle: "italic" }}>Security document not yet submitted.</p>
  }

  const ad  = doc.application_description ?? {}
  const sc  = doc.scope_and_context ?? {}
  const da  = doc.dataflow_architecture ?? {}
  const aa  = doc.application_architecture ?? {}
  const ia  = doc.integration_architecture ?? {}
  const fra = doc.functional_risk_assessment ?? {}
  const stm = doc.stride_threat_modeling ?? {}
  const cm  = doc.security_countermeasures ?? {}
  const tss = doc.threat_statement_summary ?? {}
  const kc  = ad.key_characteristics ?? {}

  const strideRows = [
    ["Spoofing",               stm.spoofing],
    ["Tampering",              stm.tampering],
    ["Repudiation",            stm.repudiation],
    ["Information Disclosure", stm.information_disclosure],
    ["Denial of Service",      stm.denial_of_service],
    ["Elevation of Privilege", stm.elevation_of_privilege],
  ] as [string, { risk: string; notes: string } | undefined][]

  return (
    <div className="sdoc">

      <h2 className="sdoc-heading">1. Application Description</h2>
      {!isEmpty(ad.summary) && (
        <p style={{ color: "var(--text-1)", marginBottom: 16, lineHeight: 1.7 }}>{String(ad.summary)}</p>
      )}
      {Object.entries(kc).map(([k, v]) => <Field key={k} label={k} value={v} />)}

      <h2 className="sdoc-heading">2. Scope and Context</h2>
      {Object.entries(sc).map(([k, v]) => <Field key={k} label={k} value={v} />)}

      <h2 className="sdoc-heading">3. Dataflow Architecture</h2>
      {!isEmpty(da.high_level_data_flow) && (
        isMermaid(String(da.high_level_data_flow))
          ? <MermaidDiagram chart={String(da.high_level_data_flow)} />
          : <p style={{ color: "var(--text-1)", lineHeight: 1.7, marginBottom: 12 }}>{String(da.high_level_data_flow)}</p>
      )}
      {!isEmpty(da.detailed_data_flow_steps) && renderDataFlowSteps(da.detailed_data_flow_steps as unknown[])}

      <h2 className="sdoc-heading">4. Application Architecture</h2>
      {Object.entries(aa).map(([k, v]) => <Field key={k} label={k} value={v} />)}

      <h2 className="sdoc-heading">5. Integration Architecture</h2>
      {Object.entries(ia).map(([k, v]) => <Field key={k} label={k} value={v} />)}

      <h2 className="sdoc-heading">6. Functional Risk Assessment</h2>
      {!isEmpty(fra.risk_level) && (
        <div className="flex items-center gap-2 mb-3">
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>Overall risk:</span>
          <RiskBadge risk={String(fra.risk_level)} />
        </div>
      )}
      {!isEmpty(fra.risk_factors) && renderList(fra.risk_factors as unknown[])}

      <h2 className="sdoc-heading">7. STRIDE Threat Modeling</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Threat</th>
              <th style={{ width: 100 }}>Risk</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {strideRows.map(([label, data]) => (
              <tr key={label}>
                <td style={{ fontWeight: 500 }}>{label}</td>
                <td><RiskBadge risk={data?.risk ?? ""} /></td>
                <td style={{ color: "var(--text-2)" }}>{data?.notes || <span style={{ color: "var(--text-3)" }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sdoc-heading">8. Security Countermeasures</h2>
      <div className="sdoc-controls-grid">
        <div>
          <p className="sdoc-controls-label">Current controls</p>
          {renderList((cm.current_controls ?? []) as unknown[])}
        </div>
        <div>
          <p className="sdoc-controls-label">Recommended controls</p>
          {renderList((cm.recommended_controls ?? []) as unknown[])}
        </div>
      </div>

      <h2 className="sdoc-heading">9. Threat Statement Summary</h2>
      {!isEmpty(tss.executive_summary) && (
        <p style={{ color: "var(--text-1)", lineHeight: 1.7, marginBottom: 16 }}>{String(tss.executive_summary)}</p>
      )}
      {!isEmpty(tss.approval_recommendation) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 14px", background: "#f9f9f9", border: "1px solid var(--border)", borderRadius: "var(--r-card)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>Recommendation:</span>
          <span style={{ fontWeight: 500, color: "var(--text-1)", fontSize: 13 }}>{String(tss.approval_recommendation)}</span>
        </div>
      )}
      <div className="sdoc-controls-grid" style={{ marginTop: 8 }}>
        {([
          ["Key strengths",  tss.key_strengths],
          ["Key concerns",   tss.key_concerns],
          ["Conditions",     tss.conditions],
          ["Residual risks", tss.residual_risks],
        ] as [string, unknown[]][]).map(([label, items]) => (
          !isEmpty(items) && (
            <div key={label}>
              <p className="sdoc-controls-label">{label}</p>
              {renderList(items)}
            </div>
          )
        ))}
      </div>
    </div>
  )
}
