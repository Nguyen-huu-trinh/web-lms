import "server-only";
import { saveRecordAction, deleteRecordAction } from "@/app/(lms)/admin-actions";
import type { MutationContext } from "@/lib/admin-validation";
import { RecordDialog } from "./record-dialog";
// Bind the page's entity/parent context on the server, not from editable form fields.
export function RecordControls({ context, values = {}, iconOnly = false }: { context: MutationContext; values?: Record<string,string | number | null>; iconOnly?: boolean }) {
  return <RecordDialog iconOnly={iconOnly} context={context} values={values} save={saveRecordAction.bind(null,context)} remove={deleteRecordAction.bind(null,context)} />;
}
