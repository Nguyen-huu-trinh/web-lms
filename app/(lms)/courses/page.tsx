import { matchesCatalogSearch, isMyCoursesFilter } from "@/lib/catalog-search";
import styles from "@/components/learning/catalog.module.css";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/services/auth";
import { catalog } from "@/repositories/lms";
import { catalogAccess } from "@/repositories/catalog-access";
import { AddStudentForm } from "@/components/add-student-form";
import { EmptyState } from "@/components/learning/shared";
import { RecordControls } from "@/components/admin/record-controls";
import { StudentList } from "@/components/admin/student-list";
export default async function Courses({ searchParams }: { searchParams: Promise<{ filter?: string; subject?: string; password?: string; q?: string }> }) {
  const { client, profile } = await requireUser();
  const query = await searchParams;
  const mine = isMyCoursesFilter(profile.role, query.filter);
  const search = (query.q ?? "").trim();
  const catalogUrl = (filter: "mine" | "all", subject?: string) => {
    const params = new URLSearchParams({ filter });
    if (search) params.set("q", search);
    if (subject) params.set("subject", subject);
    return `/courses?${params.toString()}`;
  };
  const data = await catalog(client, profile);
  const availableSubjects = mine ? data.subjects.filter((s) => data.mySubjectIds.has(s.id)) : data.subjects;
  const availableTeachers = mine ? data.teachers.filter((teacher) => data.accessibleTeacherIds.has(teacher.id)) : data.teachers;
  const matchingSubjectIds = new Set(availableTeachers.filter((teacher) => matchesCatalogSearch(teacher.name, search)).map((teacher) => teacher.subject_id));
  const subjects = availableSubjects.filter((subject) => matchesCatalogSearch(subject.name, search) || matchingSubjectIds.has(subject.id));
  const selected = subjects.find((s) => s.id === query.subject) ?? subjects[0];
  const teachers = availableTeachers.filter((teacher) => teacher.subject_id === selected?.id && (matchesCatalogSearch(selected?.name ?? "", search) || matchesCatalogSearch(teacher.name, search)));
  const admin = profile.role === "ADMIN";
  const access = admin && selected ? await catalogAccess(client, selected.id, teachers.map((teacher) => teacher.id)) : null;
  const subjectNames = new Map(data.subjects.map((subject) => [subject.id, subject.name]));
  return <main className={`${styles.catalog} space-y-6`}>
    <PageHeading eyebrow="Không gian học tập" title="Khóa học" description="Khám phá môn học và nội dung học tập của bạn." icon="book">{admin && <div className="page-actions"><RecordControls context={{entity:"subjects"}} /><AddStudentForm subjects={data.subjects} teachers={data.teachers.map((t) => ({id:t.id,name:`${t.name} · ${subjectNames.get(t.subject_id) ?? ""}`}))} /></div>}</PageHeading>
    {query.password === "changed" && <p className="notice" role="status">Đổi mật khẩu thành công.</p>}
    <div className={styles.catalogToolbar}><nav className="filter-tabs" aria-label="Lọc môn học"><Link href={catalogUrl("all")} aria-current={!mine ? "page" : undefined}><Icon name="grid" />Tất cả</Link><Link href={catalogUrl("mine")} aria-current={mine ? "page" : undefined}><Icon name="book" />Khóa học của tôi</Link></nav>
    <form action="/courses" method="get" role="search" className={styles.catalogSearch}><input type="hidden" name="filter" value={mine ? "mine" : "all"} /><button type="submit" aria-label="Tìm kiếm" title="Tìm kiếm"><Icon name="search" /></button><input id="catalog-search" name="q" type="search" aria-label="Tìm theo tên môn học hoặc giáo viên" defaultValue={search} key={search} placeholder="Tìm khóa học…" />{search && <Link href={`/courses?filter=${mine ? "mine" : "all"}`} aria-label="Xóa tìm kiếm" title="Xóa tìm kiếm"><Icon name="close" /></Link>}</form></div>
    {!subjects.length ? <div className="surface"><EmptyState title={search ? "Không tìm thấy môn học hoặc giáo viên phù hợp." : mine ? "Bạn chưa được cấp quyền vào môn học nào." : "Chưa có môn học."} description={search ? "Thử tên khác hoặc chuyển sang mục Tất cả." : mine ? "Các môn học được cấp sẽ xuất hiện tại đây." : undefined} /></div> :
    <div className="split-layout surface">
      <aside className="list-sidebar"><div className="sidebar-heading"><Icon name="layers" /><h2 className="section-label">Môn học</h2><span className="subtle-count">{subjects.length}</span></div><nav aria-label="Môn học">{subjects.map((s) => <Link key={s.id} className={selected?.id === s.id ? "selection-item active" : "selection-item"} aria-current={selected?.id === s.id ? "page" : undefined} href={catalogUrl(mine ? "mine" : "all", s.id)}><span className="selection-icon"><Icon name="book" /></span><span className="selection-copy">{s.name}</span><Icon name="chevron" className="ml-auto" /></Link>)}</nav></aside>
      <section className="detail-panel"><div className={styles.subjectHeader}><div className={styles.subjectTitle}><p className="eyebrow">Giáo viên</p><h2>{selected?.name}</h2></div>
        {admin && selected && <div className="admin-controls"><RecordControls context={{entity:"subjects",id:selected.id}} values={{name:selected.name,description:selected.description}} /><AddStudentForm target={{kind:"subject",id:selected.id,name:selected.name}} /><StudentList kind="subject" targetId={selected.id} name={selected.name} rows={access?.subject ?? []} /><RecordControls context={{entity:"teachers",parentId:selected.id}} /></div>}
        {selected?.description?.trim() && <p className={styles.subjectDescription}>{selected.description.trim()}</p>}</div>
        {!teachers.length && <EmptyState title="Môn học chưa có giáo viên." />}
        <ul className="teacher-list">{teachers.map((teacher) => <li key={teacher.id}><Link className="teacher-row" href={`/courses/teachers/${teacher.id}`}><span className="teacher-avatar" aria-hidden="true">{teacher.name.trim().slice(0,1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong>{teacher.name}</strong></span><span className="teacher-action">{data.accessibleTeacherIds.has(teacher.id) ? "Xem các khóa học" : "Chưa được cấp quyền"}<Icon name="chevron" /></span></Link>
        {admin && selected && <div className="admin-controls"><RecordControls context={{entity:"teachers",id:teacher.id,parentId:selected.id}} values={{name:teacher.name,bio:teacher.bio}} /><AddStudentForm target={{kind:"teacher",id:teacher.id,name:teacher.name}} /><StudentList kind="teacher" targetId={teacher.id} name={teacher.name} rows={access?.teachers.get(teacher.id) ?? []} /></div>}</li>)}</ul>
      </section>
    </div>}
  </main>;
}
