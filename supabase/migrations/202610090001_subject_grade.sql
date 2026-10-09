begin;

alter table public.subjects
  add column grade text not null default '2k9'
  constraint subjects_grade_valid check (grade in ('2k9', '2k8', 'student'));

commit;
