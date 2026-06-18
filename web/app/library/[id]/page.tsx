/**
 * page.tsx — legacy template-workspace route, now redirects to the Checker
 *
 * Inputs:  path id
 * Outputs: 307 redirect to /checker?template=<id>
 * Used by: old links; generation lives in the Checker, not the Templates section
 */
import { redirect } from "next/navigation";

export default function TemplateRedirect({ params }: { params: { id: string } }) {
  redirect(`/checker?template=${params.id}`);
}
