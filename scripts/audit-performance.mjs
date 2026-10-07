// Read-only audit. Does not authenticate users, activate sessions or mutate data.
import { writeFile, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
const root = process.cwd();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return {url:'data:text/javascript,export {}',shortCircuit:true};
    let target;
    if (specifier.startsWith('@/')) target = path.join(root,specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) target = path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier);
    if (target && existsSync(target + '.ts')) return {url:pathToFileURL(target + '.ts').href,shortCircuit:true};
    return nextResolve(specifier,context);
  },
  load(url,context,nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts')) return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};
    return nextLoad(url,context);
  }
});
try { process.loadEnvFile('.env.local'); } catch {}
const label = process.argv[2] || 'current';
if (!/^[a-z-]+$/.test(label)) throw new Error('Invalid output label');
const report = { timestamp:new Date().toISOString(), mode:'Read-only service-role repository audit; bypasses RLS. Not a browser or authenticated route benchmark.', http:[], repositories:[], limitations:['Browser waterfall / LCP / INP / authenticated navigation not measured','Supabase EXPLAIN and Vercel function telemetry not available'] };
const base = 'https://web-lms-chi.vercel.app';
for (const route of ['/login','/courses','/menu']) {
  for (let sample=1;sample<=3;sample++) {
    const start=performance.now();
    try {
      const response=await fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(15000)});
      const headersMs=performance.now()-start;
      const body=await response.text();
      report.http.push({route,sample,status:response.status,headersMs:Math.round(headersMs),totalMs:Math.round(performance.now()-start),bytes:Buffer.byteLength(body),cache:response.headers.get('x-vercel-cache'),region:response.headers.get('x-vercel-id')?.split('::')[0],redirect:response.headers.get('location')});
    } catch { report.http.push({route,sample,error:'Request failed or timed out'}); }
  }
}
if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  let traces=[];
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
    const method=init?.method || 'GET';
    if (method!=='GET' && method!=='HEAD') throw new Error('Audit only permits reads');
    const start=performance.now(); const resource=new URL(typeof input==='string'?input:input.url || String(input)).pathname.split('/').at(-1);
    const response=await fetch(input,{...init,signal:AbortSignal.timeout(15000)});
    const copy=await response.clone().text();
    traces.push({resource,method,status:response.status,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(copy)});
    return response;
  }}});
  try {
    const repo=await import('../repositories/lms.ts');
    const access=await import('../repositories/catalog-access.ts');
    const {data:profiles,error}=await client.from('profiles').select('*').eq('role','ADMIN').limit(1);
    if(error || !profiles?.[0]) throw new Error('No audit profile');
    const profile=profiles[0];
    async function measure(name,work) { traces=[]; const start=performance.now(); const result=await work(); report.repositories.push({name,ms:Math.round(performance.now()-start),requests:traces.length,bytes:traces.reduce((n,t)=>n+t.bytes,0),trace:traces}); return result; }
    const data=await measure('catalog-admin',()=>repo.catalog(client,profile));
    if(data.subjects[0]) await measure('catalog-access-admin',()=>(label === 'before' ? access.catalogAccess : access.catalogAccessCounts)(client,data.subjects[0].id,data.teachers.filter(t=>t.subject_id===data.subjects[0].id).map(t=>t.id)));
    const teacher=data.teachers[0];
    if(teacher) {
      const courses=await measure('teacher-courses',()=>repo.teacherCourses(client,teacher.id));
      if(courses[0]) {
        const content=await measure('course-content',()=>repo.courseContent(client,courses[0].id,profile.id,courses[0]));
        await measure('sibling-progress',()=>repo.courseProgressSummaries(client,courses.slice(1).map(c=>c.id),profile.id));
        if(content?.lessons[0]) await measure('lesson-content-admin',()=>repo.lessonContent(client,content.lessons[0].id,profile));
      }
    }
  } catch { report.limitations.push('Repository measurement could not finish; inspect connectivity/configuration locally. No secrets logged.'); }
}
await mkdir('docs/performance',{recursive:true});
await writeFile('docs/performance/'+label+'.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
