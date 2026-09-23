/**
 * Shared canned copy when Escalation Guard fires.
 * Avoid statute-claim wording (landlord/tenant/deposit) so Chat citation
 * validation is not required for the hard-stop path.
 */

import type { OptionsStep } from "@/types/session";

/** Plain-language chat reply — no citations. */
export const ESCALATION_CHAT_REPLY =
  "This question involves criminal or active-litigation issues that Clarity cannot safely advise on. Please speak with a qualified lawyer or the appropriate authority before taking further steps. Clarity does not provide courtroom strategy.";

/** Single Options next-step when the guard fires (banner remains the primary signal). */
export const ESCALATION_OPTIONS_STEP: OptionsStep = {
  id: "step-escalation",
  title: "Seek qualified legal assistance",
  body: "Clarity has stopped generating DIY next steps because this matter involves criminal or active-litigation signals. Speak with a qualified lawyer or the appropriate authority before acting. Do not rely on this tool for courtroom strategy.",
  citations: [],
};

export function escalationOptionsSteps(): OptionsStep[] {
  return [{ ...ESCALATION_OPTIONS_STEP, citations: [] }];
}
