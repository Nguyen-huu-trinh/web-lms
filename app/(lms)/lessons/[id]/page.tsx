import { requireUser } from "@/services/auth";
import { lessonContent } from "@/repositories/lms";
import { isUuid } from "@/lib/learning";
import { AccessDenied, Breadcrumb } from "@/components/learning/shared";
import { LessonWorkspace } from "@/components/learning/lesson-workspace";
import { RecordControls } from "@/components/admin/record-controls";
import { MaterialEditor } from "@/components/admin/material-editor";
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { client, profile } = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return <AccessDenied />;
  const data = await lessonContent(client, id, profile);
  if (!data) return <AccessDenied />;
  return <main className="space-y-6"><Breadcrumb items={[
    {label:"Courses",href:"/courses"}, {label:data.subject.name,href:`/courses?subject=${data.subject.id}`},
    {label:data.teacher.name,href:`/courses/teachers/${data.teacher.id}`},
    {label:data.content.course.title,href:`/courses/${data.content.course.id}`},
    {label:data.chapter.title,href:`/courses/${data.content.course.id}#chapter-${data.chapter.id}`}, {label:data.lesson.title},
  ]} /><LessonWorkspace key={id} lesson={data.lesson} materials={data.materials} content={data.content} student={profile.role === "STUDENT"} lessonTools={profile.role === "ADMIN" ? <RecordControls context={{entity:"lessons",id,parentId:data.chapter.id}} values={{title:data.lesson.title,order_index:data.lesson.order_index}} /> : undefined} materialTools={profile.role === "ADMIN" ? <MaterialEditor lessonId={id} materials={data.materials} /> : undefined} /></main>;
}
