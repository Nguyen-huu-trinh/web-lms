import { requireUser } from "@/services/auth";
import { lessonContent } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied } from "@/components/learning/shared";
import { LessonWorkspace } from "@/components/learning/lesson-workspace";
import { RecordControls } from "@/components/admin/record-controls";
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { client, profile } = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return <AccessDenied />;
  const data = await lessonContent(client, id, profile);
  if (!data) return <AccessDenied />;
  return <LessonWorkspace key={id} lesson={data.lesson} materials={data.materials} content={data.content} student={profile.role === "STUDENT"} materialActions={profile.role === "ADMIN" ? Object.fromEntries(data.materials.map((material) => [material.id, <RecordControls key={material.id} iconOnly context={{entity:"materials",id:material.id,parentId:id}} values={{title:material.title,type:material.type,provider:material.provider,url:material.url,order_index:material.order_index}} />])) : undefined} materialTools={profile.role === "ADMIN" ? <RecordControls context={{entity:"materials",parentId:id}} /> : undefined} />;
}
