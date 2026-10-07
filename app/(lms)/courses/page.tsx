import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/services/auth";
import { catalog } from "@/repositories/lms";
import { allRows } from "@/repositories/pagination";
import { AddStudentForm } from "@/components/add-student-form";
import { EmptyState } from "@/components/learning/shared";
import { RecordControls } from "@/components/admin/record-controls";
import { StudentList } from "@/components/admin/student-list";
export default async function Courses({ searchParams }: { searchParams: Promise<{ filter?: string; subject?: string; password?: string }> }) {
  const { client, profile } = await requireUser();
  const query = await searchParams;
  const mine = query.filter === "mine";
  const data = await catalog(client, profile);
  const subjects = mine ? data.subjects.filter((s) => data.mySubjectIds.has(s.id)) : data.subjects;
  const selected = subjects.find((s) => s.id === query.subject) ?? subjects[0];
  const teachers = data.teachers.filter((t) => t.subject_id === selected?.id);
  const admin = profile.role === "ADMIN";
  const [students, subjectAccess, teacherAccess] = admin ? await Promise.all([
    allRows((a,b) => client.from("profiles").select("id,email").eq("role","STUDENT").order("id").range(a,b)),
    allRows((a,b) => client.from("student_subject_access").select("id,student_id,subject_id,created_at").order("id").range(a,b)),
    allRows((a,b) => client.from("student_teacher_access").select("id,student_id,teacher_id,created_at").order("id").range(a,b)),
  ]) : [[], [], []];
  return <main className="space-y-6">
    <PageHeading eyebrow="Không gian học tập" title="Courses" description="Khám phá môn học và nội dung học tập của bạn." icon="book">{admin && <div className="page-actions"><RecordControls context={{entity:"subjects"}} /><AddStudentForm subjects={data.subjects} teachers={data.teachers.map((t) => ({id:t.id,name:`${t.name} · ${data.subjects.find((s) => s.id === t.subject_id)?.name ?? ""}`}))} /></div>}</PageHeading>
    {query.password === "changed" && <p className="notice" role="status">Đổi mật khẩu thành công.</p>}
    <nav className="filter-tabs" aria-label="Lọc môn học"><Link href="/courses" aria-current={!mine ? "page" : undefined}>Tất cả</Link><Link href="/courses?filter=mine" aria-current={mine ? "page" : undefined}>Khóa học của tôi</Link></nav>
    {!subjects.length ? <div className="surface"><EmptyState title={mine ? "Bạn chưa được cấp quyền vào môn học nào." : "Chưa có môn học."} description={mine ? "Các môn học được cấp sẽ xuất hiện tại đây." : undefined} /></div> :
    <div className="split-layout surface">
      <aside className="list-sidebar"><div className="flex items-center justify-between gap-2"><h2 className="section-label">Môn học</h2><span className="subtle-count">{subjects.length}</span></div><nav aria-label="Môn học">{subjects.map((s,index) => <Link key={s.id} className={selected?.id === s.id ? "selection-item active" : "selection-item"} aria-current={selected?.id === s.id ? "page" : undefined} href={`/courses?subject=${s.id}${mine ? "&filter=mine" : ""}`}><span className="item-index">{String(index+1).padStart(2,"0")}</span><span>{s.name}</span><Icon name="chevron" className="ml-auto" /></Link>)}</nav></aside>
      <section className="detail-panel"><div className="section-heading"><p className="eyebrow">Giáo viên</p><h2>{selected?.name}</h2>{selected?.description && <p>{selected.description}</p>}</div>
        {admin && selected && <div className="admin-controls"><RecordControls context={{entity:"subjects",id:selected.id}} values={{name:selected.name,description:selected.description}} /><AddStudentForm target={{kind:"subject",id:selected.id,name:selected.name}} /><StudentList kind="subject" targetId={selected.id} name={selected.name} rows={subjectAccess.filter((a) => a.subject_id === selected.id).map((a) => ({id:a.id,created_at:a.created_at,email:students.find((s) => s.id === a.student_id)?.email ?? "Học sinh"}))} /><RecordControls context={{entity:"teachers",parentId:selected.id}} /></div>}
        {!teachers.length && <EmptyState title="Môn học chưa có giáo viên." />}
        <ul className="teacher-list">{teachers.map((teacher) => <li key={teacher.id}><Link className="teacher-row" href={`/courses/teachers/${teacher.id}`}><span className="teacher-avatar" aria-hidden="true">{teacher.name.trim().slice(0,1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong>{teacher.name}</strong><small>{data.accessibleTeacherIds.has(teacher.id) ? "Xem các khóa học" : "Chưa được cấp quyền"}</small></span><Icon name="chevron" /></Link>
        {admin && selected && <div className="admin-controls"><RecordControls context={{entity:"teachers",id:teacher.id,parentId:selected.id}} values={{name:teacher.name,bio:teacher.bio}} /><AddStudentForm target={{kind:"teacher",id:teacher.id,name:teacher.name}} /><StudentList kind="teacher" targetId={teacher.id} name={teacher.name} rows={teacherAccess.filter((a) => a.teacher_id === teacher.id).map((a) => ({id:a.id,created_at:a.created_at,email:students.find((s) => s.id === a.student_id)?.email ?? "Học sinh"}))} /></div>}</li>)}</ul>
      </section>
    </div>}
  </main>;
}
