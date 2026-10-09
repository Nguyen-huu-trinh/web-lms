import { CatalogSubjectBrowser } from "@/components/learning/catalog-subject-browser";
import { SubjectCountsProvider } from "@/components/admin/subject-counts";
import { createLearningReader } from "@/lib/cache/learning";
import { matchesCatalogSearch, isMyCoursesFilter } from "@/lib/catalog-search";
import { selectedSubjectGrade } from "@/lib/admin-validation";
import styles from "@/components/learning/catalog.module.css";
import { NavigationLink as Link } from "@/components/ui/navigation-link";
import { PageHeading } from "@/components/ui/page-heading";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/services/auth";
import { catalog } from "@/repositories/lms";
import { catalogAccessCounts } from "@/repositories/catalog-access";
import { AddStudentForm } from "@/components/add-student-form";
import { EmptyState } from "@/components/learning/shared";
import { RecordControls } from "@/components/admin/record-controls";
import { StudentList } from "@/components/admin/student-list";
export default async function Courses({ searchParams }: { searchParams: Promise<{ filter?: string; subject?: string; password?: string; q?: string; grade?: string }> }) {
  const { client, profile, sessionId } = await requireUser();
  const read = createLearningReader(profile, sessionId);
  const query = await searchParams;
  const mine = isMyCoursesFilter(profile.role, query.filter);
  const search = (query.q ?? "").trim();
  const data = await catalog(client, profile, read);
  const admin = profile.role === "ADMIN";
  const matchingTeacherSubjects = new Set(data.teachers.filter((teacher) => matchesCatalogSearch(teacher.name, search)).map((teacher) => teacher.subject_id));
  const matchingMyTeacherSubjects = new Set(data.teachers.filter((teacher) => data.accessibleTeacherIds.has(teacher.id) && matchesCatalogSearch(teacher.name, search)).map((teacher) => teacher.subject_id));
  const subjects = data.subjects.filter((subject) => matchesCatalogSearch(subject.name, search) || matchingTeacherSubjects.has(subject.id));
  const isMine = (subject: typeof subjects[number]) => data.mySubjectIds.has(subject.id) && (matchesCatalogSearch(subject.name, search) || matchingMyTeacherSubjects.has(subject.id));
  const visibleSubjects = (mine ? subjects.filter(isMine) : subjects).filter((subject) => selectedSubjectGrade(subject.grade) === selectedSubjectGrade(query.grade));
  const selected = visibleSubjects.find((subject) => subject.id === query.subject) ?? visibleSubjects[0];
  const teachersFor = (subject: typeof subjects[number]) => data.teachers.filter((teacher) => teacher.subject_id === subject.id && (matchesCatalogSearch(subject.name, search) || matchesCatalogSearch(teacher.name, search)));
  const access = admin && selected ? await catalogAccessCounts(client, selected.id, teachersFor(selected).map((teacher) => teacher.id)) : null;
  const subjectNames = new Map(data.subjects.map((subject) => [subject.id, subject.name]));
  // Mutations and explicit refreshes replace the local snapshot; filter toggles do not.
  const viewVersion = crypto.randomUUID();
  return <main className={`${styles.catalog} space-y-6`}>
    <PageHeading eyebrow="Không gian học tập" title="Khóa học" description="Khám phá môn học và nội dung học tập của bạn." icon="book">{admin && <div className="page-actions"><RecordControls context={{entity:"subjects"}} /><AddStudentForm subjects={data.subjects} teachers={data.teachers.map((teacher) => ({id:teacher.id,name:teacher.name + " · " + (subjectNames.get(teacher.subject_id) ?? "")}))} /></div>}</PageHeading>
    {query.password === "changed" && <p className="notice" role="status">Đổi mật khẩu thành công.</p>}
    <CatalogSubjectBrowser key={viewVersion} role={profile.role} search={search} subjects={subjects.map((subject) => {
      const renderPanel = (subjectTeachers: typeof data.teachers) => {
      return (<section className="detail-panel"><div className={styles.subjectHeader}><div className={styles.subjectTitle}><p className="eyebrow">Giáo viên</p><h2>{subject?.name}</h2></div>
        {admin && subject && <div className="admin-controls"><RecordControls context={{entity:"subjects",id:subject.id}} values={{name:subject.name,description:subject.description,grade:selectedSubjectGrade(subject.grade)}} /><AddStudentForm target={{kind:"subject",id:subject.id,name:subject.name}} /><StudentList kind="subject" targetId={subject.id} name={subject.name} /><RecordControls context={{entity:"teachers",parentId:subject.id}} /></div>}
        {subject?.description?.trim() && <p className={styles.subjectDescription}>{subject.description.trim()}</p>}</div>
        {!subjectTeachers.length && <EmptyState title="Môn học chưa có giáo viên." />}
        <ul className="teacher-list">{subjectTeachers.map((teacher) => <li key={teacher.id}><Link className="teacher-row" href={`/courses/teachers/${teacher.id}`}><span className="teacher-avatar" aria-hidden="true">{teacher.name.trim().slice(0,1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong>{teacher.name}</strong></span><span className="teacher-action">{data.accessibleTeacherIds.has(teacher.id) ? "Xem các khóa học" : "Chưa được cấp quyền"}<Icon name="chevron" /></span></Link>
        {admin && subject && <div className="admin-controls"><RecordControls context={{entity:"teachers",id:teacher.id,parentId:subject.id}} values={{name:teacher.name,bio:teacher.bio}} /><AddStudentForm target={{kind:"teacher",id:teacher.id,name:teacher.name}} /><StudentList kind="teacher" targetId={teacher.id} name={teacher.name} /></div>}</li>)}</ul>
      </section>);

      };
      const allTeachers = teachersFor(subject);
      const panel = renderPanel(allTeachers);
      const wrap = (content: React.ReactNode) => admin ? <SubjectCountsProvider subjectId={subject.id} initial={subject.id === selected?.id && access ? { subject: access.subject, teachers: Object.fromEntries(access.teachers) } : undefined}>{content}</SubjectCountsProvider> : content;
      return { id: subject.id, name: subject.name, grade: selectedSubjectGrade(subject.grade), mine: isMine(subject), panel: wrap(panel), minePanel: admin ? wrap(panel) : renderPanel(allTeachers.filter((teacher) => data.accessibleTeacherIds.has(teacher.id))) };
    })} />
  </main>;
}
