import { TeacherList } from "@/components/learning/teacher-list";
import { subjectSymbol } from "@/lib/subject-symbol";
import { GradeControls } from "@/components/admin/grade-controls";
import { TeacherEntry } from "@/components/learning/teacher-entry";
import { CreateGrade } from "@/components/admin/create-grade";
import { allRows } from "@/repositories/pagination";
import { CatalogSubjectBrowser } from "@/components/learning/catalog-subject-browser";
import { SubjectCountsProvider } from "@/components/admin/subject-counts";
import { createLearningReader } from "@/lib/cache/learning";
import { matchesCatalogSearch, isMyCoursesFilter } from "@/lib/catalog-search";
import { selectedSubjectGrade } from "@/lib/admin-validation";
import styles from "@/components/learning/course-home.module.css";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/services/auth";
import { catalog, courseProgressSummaries } from "@/repositories/lms";
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
  const [data, grades] = await Promise.all([
    catalog(client, profile, read),
    allRows((a, b) => client.from("grades").select("*").order("order_index").order("name").order("code").range(a, b)),
  ]);
  const grade = selectedSubjectGrade(query.grade, grades);
  const admin = profile.role === "ADMIN";
  const matchingTeacherSubjects = new Set(data.teachers.filter((teacher) => matchesCatalogSearch(teacher.name, search)).map((teacher) => teacher.subject_id));
  const matchingMyTeacherSubjects = new Set(data.teachers.filter((teacher) => data.accessibleTeacherIds.has(teacher.id) && matchesCatalogSearch(teacher.name, search)).map((teacher) => teacher.subject_id));
  const subjects = data.subjects.filter((subject) => matchesCatalogSearch(subject.name, search) || matchingTeacherSubjects.has(subject.id));
  const isMine = (subject: typeof subjects[number]) => data.mySubjectIds.has(subject.id) && (matchesCatalogSearch(subject.name, search) || matchingMyTeacherSubjects.has(subject.id));
  const visibleSubjects = (mine ? subjects.filter(isMine) : subjects).filter((subject) => subject.grade === grade);
  const selected = visibleSubjects.find((subject) => subject.id === query.subject) ?? visibleSubjects[0];
  const teachersFor = (subject: typeof subjects[number]) => data.teachers.filter((teacher) => teacher.subject_id === subject.id && (matchesCatalogSearch(subject.name, search) || matchesCatalogSearch(teacher.name, search)));
  const access = admin && selected ? await catalogAccessCounts(client, selected.id, teachersFor(selected).map((teacher) => teacher.id)) : null;
  const courses = await allRows((a,b) => client.from("courses").select("id,teacher_id").order("id").range(a,b));
  const progress = profile.role === "STUDENT" ? await courseProgressSummaries(client, courses.map((c) => c.id), profile.id) : {};
  const stats = new Map<string, {total: number; count: number}>();
  for (const course of courses) {
    const previous = stats.get(course.teacher_id) ?? {total:0,count:0};
    const next = progress[course.id];
    stats.set(course.teacher_id, { total: previous.total + (next?.total ?? 0), count: previous.count + (next?.count ?? 0) });
  }
  // Mutations and explicit refreshes replace the local snapshot; filter toggles do not.
  const viewVersion = crypto.randomUUID();
  return <main className={styles.home}>
    {!grades.length && <EmptyState title="Chưa có khối học." description={admin ? "Tạo khối trước, sau đó thêm môn học vào khối." : "Chưa có khối học được tạo."} />}
    {query.password === "changed" && <p className="notice" role="status">Đổi mật khẩu thành công.</p>}
    <CatalogSubjectBrowser key={viewVersion} role={profile.role} search={search} grades={grades}
      createGrade={admin ? <CreateGrade /> : undefined}
      addSubject={admin ? Object.fromEntries(grades.map((item) => [item.code, <RecordControls key={item.code} iconOnly grades={grades} context={{entity:"subjects",gradeCode:item.code}} values={{grade:item.code}} />])) : {}}
      gradeActions={admin ? Object.fromEntries(grades.map((item) => { const items = data.subjects.filter((subject) => subject.grade === item.code); return [item.code, <div key={item.code}><GradeControls code={item.code} name={item.name} orderIndex={item.order_index} /><AddStudentForm iconOnly disabled={!items.length} gradeName={item.name} subjects={items} initialSubjectIds={items.map((subject) => subject.id)} /></div>]; })) : {}}
      subjects={subjects.map((subject) => {
      const renderPanel = (subjectTeachers: typeof data.teachers) => {
      return (<TeacherList names={subjectTeachers.map((teacher) => teacher.name)} heading={<div className={styles.heading}><span className={styles.subjectSymbol} aria-hidden="true">{subjectSymbol(subject.name)}</span><div><h1>{/^môn /i.test(subject.name) ? subject.name : `Môn ${subject.name}`}</h1><p>{subjectTeachers.length} giáo viên & lộ trình học tập</p></div><span className={styles.headingCount}>{subjectTeachers.length} Khóa học</span>
        {admin && subject && <div className="admin-controls"><RecordControls iconOnly grades={grades} context={{entity:"subjects",id:subject.id}} values={{name:subject.name,description:subject.description,grade:subject.grade}} /><AddStudentForm iconOnly target={{kind:"subject",id:subject.id,name:subject.name}} /><StudentList iconOnly kind="subject" targetId={subject.id} name={subject.name} /><RecordControls iconOnly context={{entity:"teachers",parentId:subject.id}} /></div>}
        {subject?.description?.trim() && <p className="muted">{subject.description.trim()}</p>}</div>}>
        {!subjectTeachers.length && <EmptyState title="Môn học chưa có giáo viên." />}
        <ul className={styles.cards}>{subjectTeachers.map((teacher) => { const stat = stats.get(teacher.id); const percent = stat?.total ? Math.round(stat.count / stat.total * 100) : 0; return <li className={styles.card} data-featured={percent > 0 && percent < 80} key={teacher.id}><span className={styles.accessStar} data-active={data.accessibleTeacherIds.has(teacher.id)} title={data.accessibleTeacherIds.has(teacher.id) ? "Đã được cấp quyền" : "Chưa được cấp quyền"}><Icon name="star" /></span><div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{teacher.name.trim().slice(0,1).toUpperCase()}</span><div><h2>{teacher.name}</h2><p>{teacher.bio || "Lộ trình học tập"}</p></div></div><div className={styles.progress} data-complete={percent >= 80} data-started={percent > 0}><span className={styles.progressValue}>{percent > 0 ? `${percent}%` : "Ch\u01b0a h\u1ecdc"}</span><progress aria-label={`Tiến độ ${teacher.name}`} value={percent} max={100} /></div><TeacherEntry id={teacher.id} featured={percent > 0 && percent < 80} started={percent > 0} />
        {admin && subject && <div className="admin-controls"><RecordControls iconOnly context={{entity:"teachers",id:teacher.id,parentId:subject.id}} values={{name:teacher.name,bio:teacher.bio,status:teacher.status}} /><AddStudentForm iconOnly target={{kind:"teacher",id:teacher.id,name:teacher.name}} /><StudentList iconOnly kind="teacher" targetId={teacher.id} name={teacher.name} /></div>}</li>; })}</ul>
      </TeacherList>);

      };
      const allTeachers = teachersFor(subject);
      const panel = renderPanel(allTeachers);
      const wrap = (content: React.ReactNode) => admin ? <SubjectCountsProvider subjectId={subject.id} initial={subject.id === selected?.id && access ? { subject: access.subject, teachers: Object.fromEntries(access.teachers) } : undefined}>{content}</SubjectCountsProvider> : content;
      return { id: subject.id, name: subject.name, grade: subject.grade, mine: isMine(subject), teacherCount: allTeachers.length, panel: wrap(panel), minePanel: admin ? wrap(panel) : renderPanel(allTeachers.filter((teacher) => data.accessibleTeacherIds.has(teacher.id))) };
    })} />
  </main>;
}
