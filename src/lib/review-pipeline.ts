import "server-only"
import { supabaseServer } from "@/lib/supabase-server"

export type ReviewStage = {
  id: string
  name: string
  stage_order: number
  assigned_role: string
  applies_to_classifications: string[]
  notify_slack: boolean
  notify_email: boolean
  custom_questions: { id: string; question: string; required: boolean }[]
}

/**
 * Fetch all pipeline stages for an org, filtered to those that apply to the
 * given classification. Empty applies_to_classifications = applies to all.
 * Returns stages ordered by stage_order ascending.
 */
export async function computeApplicableStages(
  orgId: string,
  classification: string
): Promise<ReviewStage[]> {
  const { data } = await supabaseServer
    .from("review_stages")
    .select("id, name, stage_order, assigned_role, applies_to_classifications, notify_slack, notify_email, custom_questions")
    .eq("org_id", orgId)
    .order("stage_order", { ascending: true })

  return (data ?? []).filter((s: ReviewStage) =>
    s.applies_to_classifications.length === 0 ||
    s.applies_to_classifications.includes(classification)
  )
}

/**
 * Given an ordered list of applicable stage IDs and the current stage ID,
 * returns the ID of the next stage, or null if this is the last stage.
 */
export function getNextStageId(
  applicableStageIds: string[],
  currentStageId: string
): string | null {
  const idx = applicableStageIds.indexOf(currentStageId)
  if (idx === -1 || idx >= applicableStageIds.length - 1) return null
  return applicableStageIds[idx + 1]
}
