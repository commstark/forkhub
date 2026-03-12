// Builds an initial security_doc JSONB record pre-filled from tool metadata.
// The AI agent fills in the empty strings via POST /api/reviews/[id]/security-doc.

export function buildInitialSecurityDoc(tool: {
  file_type: string
  file_name: string
  classification: string
  category: string
}) {
  const ext = tool.file_name.split(".").pop() ?? ""

  const appType =
    tool.file_type === "text/html" || ext === "html" ? "Web Application (HTML)" :
    ext === "py" || tool.file_type?.includes("python") ? "Python Script" :
    ext === "js" || tool.file_type?.includes("javascript") ? "JavaScript Application" :
    ext === "ts" || ext === "tsx" ? "TypeScript Application" :
    ext === "sql" ? "SQL Script" :
    tool.category || "Tool / Utility"

  const accessModel =
    tool.classification === "external_customer" ? "External / Customer-facing" :
    tool.classification === "internal_customer"  ? "Internal with customer data access" :
    "Internal only"

  const dataSensitivity: string[] =
    tool.classification === "external_customer" ? ["Customer Data", "External Access"] :
    tool.classification === "internal_customer"  ? ["Internal", "Customer Data"] :
    ["Internal"]

  const intendedUsers =
    tool.classification === "external_customer" ? "External customers" :
    tool.classification === "internal_customer"  ? "Internal staff (with customer data access)" :
    "Internal staff only"

  return {
    application_description: {
      summary: "",
      key_characteristics: {
        application_type: appType,
        authentication_model: "",
        data_persistence: "",
        hosting_platform: "The Fork Hub",
        access_model: accessModel,
        technology_stack: tool.file_type || ext || "",
        external_integrations: "",
      },
    },
    scope_and_context: {
      business_purpose: "",
      intended_users: intendedUsers,
      intended_use_cases: "",
      what_it_does_not_do: "",
      data_sensitivity_classification: dataSensitivity,
    },
    dataflow_architecture: {
      high_level_data_flow: "",
      detailed_data_flow_steps: [] as string[],
    },
    application_architecture: {
      components: "",
      hosting: "The Fork Hub Storage",
      dependencies: tool.file_type || ext || "",
    },
    integration_architecture: {
      external_apis: "",
      authentication_methods: "",
      data_exchange_formats: "",
    },
    functional_risk_assessment: {
      risk_level: "",
      risk_factors: [] as string[],
    },
    stride_threat_modeling: {
      spoofing:               { risk: "", notes: "" },
      tampering:              { risk: "", notes: "" },
      repudiation:            { risk: "", notes: "" },
      information_disclosure: { risk: "", notes: "" },
      denial_of_service:      { risk: "", notes: "" },
      elevation_of_privilege: { risk: "", notes: "" },
    },
    security_countermeasures: {
      current_controls:     [] as string[],
      recommended_controls: [] as string[],
    },
    threat_statement_summary: {
      executive_summary:       "",
      key_strengths:           [] as string[],
      key_concerns:            [] as string[],
      approval_recommendation: "",
      conditions:              [] as string[],
      residual_risks:          [] as string[],
    },
  }
}
