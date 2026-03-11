"use client"

import { useEffect, useRef } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SecurityDocData = Record<string, any>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true
  if (Array.isArray(v)) return v.length === 0
  return false
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8">{children}</h2>
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (isEmpty(value)) return (
    <div className="grid grid-cols-3 gap-4 py-1.5">
      <dt className="text-sm text-gray-500 capitalize">{label.replace(/_/g, " ")}</dt>
      <dd className="col-span-2 text-sm text-gray-300 italic">Not yet provided</dd>
    </div>
  )
  if (Array.isArray(value)) return (
    <div className="grid grid-cols-3 gap-4 py-1.5">
      <dt className="text-sm text-gray-500 capitalize">{label.replace(/_/g, " ")}</dt>
      <dd className="col-span-2">
        <ul className="list-disc list-inside space-y-0.5">
          {value.map((item, i) => <li key={i} className="text-sm text-gray-700">{String(item)}</li>)}
        </ul>
      </dd>
    </div>
  )
  return (
    <div className="grid grid-cols-3 gap-4 py-1.5">
      <dt className="text-sm text-gray-500 capitalize">{label.replace(/_/g, " ")}</dt>
      <dd className="col-span-2 text-sm text-gray-700">{String(value)}</dd>
    </div>
  )
}

const RISK_COLORS: Record<string, string> = {
  low:      "bg-green-100 text-green-800",
  medium:   "bg-yellow-100 text-yellow-800",
  high:     "bg-red-100 text-red-800",
  critical: "bg-red-200 text-red-900",
}

function RiskBadge({ risk }: { risk: string }) {
  if (!risk) return <span className="text-gray-300 text-xs">—</span>
  const color = RISK_COLORS[risk.toLowerCase()] ?? "bg-gray-100 text-gray-700"
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{risk}</span>
}

// ─── Mermaid diagram ─────────────────────────────────────────────────────────

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
        if (ref.current) ref.current.innerHTML = `<pre class="text-xs text-gray-500 p-2">${chart}</pre>`
      }
    })
  }, [chart])

  return <div ref={ref} className="overflow-auto rounded-lg border border-gray-200 p-4 bg-white" />
}

function isMermaid(s: string) {
  const t = s.trim().toLowerCase()
  return t.startsWith("flowchart") || t.startsWith("graph") || t.startsWith("sequencediagram") || t.startsWith("erdiagram")
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityDoc({ doc }: { doc: SecurityDocData }) {
  if (!doc || Object.keys(doc).length === 0) {
    return <p className="text-sm text-gray-400 italic">Security document not yet submitted.</p>
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
    <div className="text-sm">

      {/* ── 1. Application Description ── */}
      <SectionHeading>1. Application Description</SectionHeading>
      {!isEmpty(ad.summary) && <p className="text-gray-700 mb-4 leading-relaxed">{ad.summary}</p>}
      <dl className="space-y-0.5">
        {Object.entries(kc).map(([k, v]) => <Field key={k} label={k} value={v} />)}
      </dl>

      {/* ── 2. Scope and Context ── */}
      <SectionHeading>2. Scope and Context</SectionHeading>
      <dl className="space-y-0.5">
        {Object.entries(sc).map(([k, v]) => <Field key={k} label={k} value={v} />)}
      </dl>

      {/* ── 3. Dataflow Architecture ── */}
      <SectionHeading>3. Dataflow Architecture</SectionHeading>
      {!isEmpty(da.high_level_data_flow) && (
        isMermaid(String(da.high_level_data_flow))
          ? <MermaidDiagram chart={String(da.high_level_data_flow)} />
          : <p className="text-gray-700 mb-4 leading-relaxed">{String(da.high_level_data_flow)}</p>
      )}
      {!isEmpty(da.detailed_data_flow_steps) && (
        <ol className="list-decimal list-inside space-y-1 mt-3">
          {(da.detailed_data_flow_steps as string[]).map((step, i) => (
            <li key={i} className="text-gray-700">{step}</li>
          ))}
        </ol>
      )}

      {/* ── 4. Application Architecture ── */}
      <SectionHeading>4. Application Architecture</SectionHeading>
      <dl className="space-y-0.5">
        {Object.entries(aa).map(([k, v]) => <Field key={k} label={k} value={v} />)}
      </dl>

      {/* ── 5. Integration Architecture ── */}
      <SectionHeading>5. Integration Architecture</SectionHeading>
      <dl className="space-y-0.5">
        {Object.entries(ia).map(([k, v]) => <Field key={k} label={k} value={v} />)}
      </dl>

      {/* ── 6. Functional Risk Assessment ── */}
      <SectionHeading>6. Functional Risk Assessment</SectionHeading>
      {!isEmpty(fra.risk_level) && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-500">Overall risk:</span>
          <RiskBadge risk={String(fra.risk_level)} />
        </div>
      )}
      {!isEmpty(fra.risk_factors) && (
        <ul className="list-disc list-inside space-y-1">
          {(fra.risk_factors as string[]).map((f, i) => <li key={i} className="text-gray-700">{f}</li>)}
        </ul>
      )}

      {/* ── 7. STRIDE Threat Modeling ── */}
      <SectionHeading>7. STRIDE Threat Modeling</SectionHeading>
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 border-b border-gray-200">Threat</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 border-b border-gray-200 w-28">Risk</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 border-b border-gray-200">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {strideRows.map(([label, data]) => (
              <tr key={label} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-700">{label}</td>
                <td className="px-4 py-2.5"><RiskBadge risk={data?.risk ?? ""} /></td>
                <td className="px-4 py-2.5 text-gray-600">{data?.notes || <span className="text-gray-300">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 8. Security Countermeasures ── */}
      <SectionHeading>8. Security Countermeasures</SectionHeading>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current controls</p>
          {isEmpty(cm.current_controls)
            ? <p className="text-gray-300 text-sm italic">None listed</p>
            : <ul className="list-disc list-inside space-y-1">
                {(cm.current_controls as string[]).map((c, i) => <li key={i} className="text-gray-700">{c}</li>)}
              </ul>
          }
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recommended controls</p>
          {isEmpty(cm.recommended_controls)
            ? <p className="text-gray-300 text-sm italic">None listed</p>
            : <ul className="list-disc list-inside space-y-1">
                {(cm.recommended_controls as string[]).map((c, i) => <li key={i} className="text-gray-700">{c}</li>)}
              </ul>
          }
        </div>
      </div>

      {/* ── 9. Threat Statement Summary ── */}
      <SectionHeading>9. Threat Statement Summary</SectionHeading>
      {!isEmpty(tss.executive_summary) && (
        <p className="text-gray-700 mb-4 leading-relaxed">{tss.executive_summary}</p>
      )}
      {!isEmpty(tss.approval_recommendation) && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recommendation:</span>
          <span className="font-medium text-gray-800">{String(tss.approval_recommendation)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6 mt-2">
        {[
          ["Key strengths",  tss.key_strengths],
          ["Key concerns",   tss.key_concerns],
          ["Conditions",     tss.conditions],
          ["Residual risks", tss.residual_risks],
        ].map(([label, items]) => (
          !isEmpty(items) && (
            <div key={label as string}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label as string}</p>
              <ul className="list-disc list-inside space-y-1">
                {(items as string[]).map((item, i) => <li key={i} className="text-gray-700">{item}</li>)}
              </ul>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
