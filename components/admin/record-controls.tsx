import "server-only";
import { saveRecordAction, deleteRecordAction } from "@/app/(lms)/admin-actions";
import type { MutationContext, GradeOption } from "@/lib/admin-validation";
import { RecordDialog } from "./record-dialog";
// Bind the page's entity/parent context on the server, not from editable form fields.
export function RecordControls({ context, values = {}, iconOnly = true, grades = [] }: { context: MutationContext; values?: Record<string,string | number | null>; iconOnly?: boolean; grades?: GradeOption[] }) {
  return <RecordDialog grades={grades} iconOnly={iconOnly} context={context} values={values} save={saveRecordAction.bind(null,context)} remove={deleteRecordAction.bind(null,context)} />;
}
