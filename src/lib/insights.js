// Everything Horizon "knows" about the student is computed here from their own data.
import { AFRICAN, DECLARABLE_DOCS, ACTIVE_STATUSES } from './constants.js';
import { roadmapProgress } from './roadmap.js';

/* ---------- dates ---------- */
export function daysUntil(iso) {
  if (!iso) return null;
  // Whole calendar days from today: 0 = today, 1 = tomorrow, negative = passed.
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 864e5);
}
export function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  const d = typeof iso === 'number' ? new Date(iso) : new Date(String(iso).length === 10 ? iso + 'T12:00:00' : iso);
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, opts);
}
export function deadlineInfo(opp) {
  if (!opp?.deadline) return { label: opp?.deadlineText ? opp.deadlineText : 'Deadline not stated', tone: 'muted', days: null, known: false };
  const days = daysUntil(opp.deadline);
  if (days < 0) return { label: `Closed ${fmtDate(opp.deadline)}`, tone: 'closed', days, known: true, closed: true };
  if (days === 0) return { label: 'Closes today', tone: 'urgent', days, known: true };
  if (days <= 14) return { label: `${days} day${days === 1 ? '' : 's'} left`, tone: 'urgent', days, known: true };
  if (days <= 45) return { label: `${days} days left`, tone: 'soon', days, known: true };
  return { label: `Closes ${fmtDate(opp.deadline)}`, tone: 'ok', days, known: true };
}
export function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24); if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return fmtDate(ts);
}

/* ---------- labels ---------- */
export function levelLabel(p) {
  if (!p) return '';
  const map = { secondary: 'Secondary school', graduate: 'Recent graduate', masters: "Master's student", phd: 'PhD student' };
  return map[p.level] || `${p.level} Level`;
}
export const firstName = (p) => (p?.name || '').trim().split(/\s+/)[0] || 'there';

/* ---------- documents ---------- */
const DOC_KINDS = [
  { key: 'transcript', label: 'Transcript', re: /transcript|academic record|result|grade report|statement of result/i, cat: 'academic', subs: ['Transcript', 'Academic record', 'Results'] },
  { key: 'cv', label: 'CV / resume', re: /\bcv\b|curriculum vitae|r[eé]sum[eé]/i, cat: 'career', subs: ['CV', 'Resume'] },
  { key: 'recommendation', label: 'Recommendation letter', re: /recommend|reference letter|referee|letter of support/i, cat: 'recommendations' },
  { key: 'statement', label: 'Personal statement / essay', re: /personal statement|statement of purpose|\bsop\b|motivation letter|essay|cover letter|letter of motivation|statement of intent/i, cat: 'applications' },
  { key: 'id', label: 'Passport or ID', re: /passport(?! photo)|national id|identification|id card|\bnin\b|birth certificate|proof of (citizenship|nationality)/i, cat: 'identity' },
  { key: 'certificate', label: 'Certificates', re: /certificate|waec|ssce|neco|diploma|degree/i, cat: 'certificates' },
  { key: 'language', label: 'English test result', re: /ielts|toefl|english (language )?proficiency|language test/i, cat: 'academic', subs: ['Results'] },
  { key: 'portfolio', label: 'Portfolio', re: /portfolio|work samples?/i, cat: 'career', subs: ['Portfolio'] },
  { key: 'admission', label: 'Admission letter', re: /admission letter|offer letter|letter of admission|acceptance letter/i, cat: 'other' },
  { key: 'photo', label: 'Passport photograph', re: /photograph|passport photo|headshot/i, cat: 'other' },
];

export function classifyRequirement(text) {
  const k = DOC_KINDS.find((d) => d.re.test(text));
  return k ? k.key : null;
}
export const docKind = (key) => DOC_KINDS.find((d) => d.key === key);

// Guess a vault category from a file name when uploading.
export function guessCategory(name) {
  const n = name.toLowerCase();
  if (/transcript|result|grade/.test(n)) return { category: 'academic', sub: /transcript/.test(n) ? 'Transcript' : 'Results' };
  if (/\bcv\b|cv[_\-. ]|resume|curriculum/.test(n)) return { category: 'career', sub: /resume/.test(n) ? 'Resume' : 'CV' };
  if (/portfolio/.test(n)) return { category: 'career', sub: 'Portfolio' };
  if (/recommend|reference|referee/.test(n)) return { category: 'recommendations', sub: 'Recommendation letter' };
  if (/statement|essay|\bsop\b|motivation/.test(n)) return { category: 'applications', sub: /purpose|sop/.test(n) ? 'Statement of purpose' : /essay/.test(n) ? 'Essay' : 'Personal statement' };
  if (/passport|national.?id|\bnin\b|id.?card|birth/.test(n)) return { category: 'identity', sub: /passport/.test(n) ? 'Passport' : 'National ID' };
  if (/award|prize|honou?r/.test(n)) return { category: 'achievements', sub: 'Award' };
  if (/certificate|cert|course|training|coursera|udemy|hackathon/.test(n)) return { category: 'certificates', sub: /hackathon|competition/.test(n) ? 'Competition' : /training/.test(n) ? 'Training' : 'Course' };
  return { category: 'other', sub: 'Other' };
}

// Status of one document kind for this student: uploaded | built | draft | declared | missing
export function docStatus(state, key) {
  const kind = docKind(key);
  const docs = state.documents.filter((d) => d.status !== 'failed');
  if (kind) {
    const has = docs.find((d) => d.category === kind.cat && (!kind.subs || kind.subs.includes(d.sub)));
    if (has) return { status: 'uploaded', doc: has };
  }
  if (key === 'cv' && state.cv?.updatedAt) return { status: 'built' };
  if (key === 'statement' && state.essays.length) return { status: 'draft', essay: state.essays[0] };
  if (key === 'certificate' && state.experiences.some((e) => e.type === 'certification')) return { status: 'declared' };
  const declaredKey = { certificate: 'certificates', id: 'passport' }[key] || key;
  if (state.profile?.docsHave?.includes(declaredKey)) return { status: 'declared' };
  return { status: 'missing' };
}

export function requirementsFor(state, opp) {
  return (opp?.requiredDocuments || []).map((text) => {
    const key = classifyRequirement(text);
    const st = key ? docStatus(state, key) : { status: 'unknown' };
    return { text, key, ...st };
  });
}

/* ---------- profile completeness ---------- */
export function profileCompleteness(state) {
  const p = state.profile || {};
  const g = p.goal || {};
  const items = [
    { key: 'name', label: 'Your name', ok: !!p.name, to: '/profile#about' },
    { key: 'institution', label: 'Your institution', ok: !!p.institution, to: '/profile#about' },
    { key: 'level', label: 'Your academic level', ok: !!p.level, to: '/profile#about' },
    { key: 'course', label: 'What you study', ok: !!p.course, to: '/profile#about' },
    { key: 'grades', label: 'Your current grades (CGPA)', ok: !!p.cgpa || p.cgpaNA, to: '/profile#about' },
    { key: 'goal', label: 'Your main goal', ok: !!g.type, to: '/profile#goal' },
    { key: 'destinations', label: 'Where you want to go', ok: g.type !== 'study-abroad' || (p.destinations || []).length > 0 || p.openToAnywhere, to: '/profile#goal' },
    { key: 'skills', label: 'At least three skills', ok: state.skills.length >= 3, to: '/profile#skills' },
    { key: 'experience', label: 'At least one experience or project', ok: state.experiences.length > 0, to: '/profile?add=project' },
    { key: 'details', label: 'Descriptions for your experiences', ok: state.experiences.length > 0 && state.experiences.every((e) => (e.description || '').trim().length >= 30), to: '/profile#experience' },
  ];
  const done = items.filter((i) => i.ok).length;
  return { pct: Math.round((done / items.length) * 100), items, missing: items.filter((i) => !i.ok) };
}

/* ---------- gap analysis ---------- */
const TECH = /(computer|software|information|data|cyber|ai\b|artificial|machine|engineer|tech)/i;

export function gapAnalysis(state) {
  const p = state.profile || {};
  const g = p.goal || {};
  const ex = state.experiences;
  const count = (types) => ex.filter((e) => types.includes(e.type)).length;
  const ov = state.gapOverrides || {};
  const tech = TECH.test(`${p.course} ${g.field}`);
  const abroad = g.type === 'study-abroad';
  const prof = profileCompleteness(state);

  const items = [];
  const add = (x) => items.push({ ...x, override: ov[x.key], met: x.met || ov[x.key] === 'done' || ov[x.key] === 'not-needed' });

  add({ key: 'profile', area: 'Profile', title: 'Complete profile', need: 'All key details filled in', have: `${prof.pct}% complete`, met: prof.pct === 100, why: 'Horizon uses your profile to match opportunities and draft applications.', action: { label: 'Complete your profile', to: prof.missing[0]?.to || '/profile' } });
  const cv = docStatus(state, 'cv');
  add({ key: 'cv', area: 'Documents', title: 'An up-to-date CV', need: 'A current CV', have: cv.status === 'uploaded' ? 'Uploaded' : cv.status === 'built' ? 'Built in Horizon' : cv.status === 'declared' ? 'You have one, but it is not uploaded yet' : 'Not yet', met: ['uploaded', 'built'].includes(cv.status), why: 'Almost every scholarship, internship and programme asks for a CV.', action: { label: cv.status === 'declared' ? 'Upload your CV' : 'Build your CV', to: cv.status === 'declared' ? '/documents?upload=1&category=career' : '/cv' } });
  const tr = docStatus(state, 'transcript');
  add({ key: 'transcript', area: 'Documents', title: 'Transcript or results', need: 'Your latest results', have: tr.status === 'uploaded' ? 'Uploaded' : tr.status === 'declared' ? 'You have it, not uploaded' : 'Not yet', met: tr.status === 'uploaded', why: 'Academic records are one of the most commonly required documents.', action: { label: 'Upload transcript', to: '/documents?upload=1&category=academic' } });
  const projNeed = tech ? 2 : 1;
  add({ key: 'projects', area: 'Portfolio', title: tech ? 'Portfolio projects' : 'Portfolio pieces', need: `${projNeed}+ ${tech ? 'projects' : 'pieces of work'}`, have: `${count(['project'])} added`, met: count(['project']) >= projNeed, why: 'Projects show what you can actually do, beyond grades.', action: { label: 'Add a project', to: '/profile?add=project' } });
  add({ key: 'leadership', area: 'Experience', title: 'Leadership experience', need: 'At least one leadership role', have: `${count(['leadership'])} added`, met: count(['leadership']) >= 1, why: 'Many scholarships and fellowships list leadership among their selection criteria.', action: { label: 'Add a leadership role', to: '/profile?add=leadership' } });
  if (['study-abroad', 'research', 'scholarship', 'leadership'].includes(g.type)) {
    add({ key: 'impact', area: 'Experience', title: 'Research or community work', need: 'At least one activity', have: `${count(['research', 'volunteering'])} added`, met: count(['research', 'volunteering']) >= 1, why: 'Research and community impact often set applicants apart.', action: { label: 'Add research or volunteering', to: '/profile?add=research' } });
  }
  if (['internship', 'job'].includes(g.type)) {
    add({ key: 'work', area: 'Experience', title: 'Work or internship experience', need: 'At least one role', have: `${count(['work', 'internship'])} added`, met: count(['work', 'internship']) >= 1, why: 'Employers look for evidence you can work in a team and deliver.', action: { label: 'Add an internship', to: '/profile?add=internship' } });
  }
  const certs = state.documents.filter((d) => d.category === 'certificates').length + count(['certification']);
  add({ key: 'certificates', area: 'Evidence', title: 'Certificates', need: 'At least one relevant certificate', have: `${certs} recorded`, met: certs >= 1, why: 'Certificates are quick proof of skills and commitment.', action: { label: 'Upload a certificate', to: '/documents?upload=1&category=certificates' } });
  const recs = state.documents.filter((d) => d.category === 'recommendations').length;
  add({ key: 'recommendations', area: 'Documents', title: 'Recommendation letters', need: '2 letters (usually requested later)', have: `${recs} uploaded`, met: recs >= 2, why: 'Letters take time. Building relationships with referees early makes them stronger.', action: { label: 'Upload a letter', to: '/documents?upload=1&category=recommendations' } });
  const st = docStatus(state, 'statement');
  add({ key: 'statement', area: 'Writing', title: 'Personal statement draft', need: 'A working draft', have: st.status === 'uploaded' ? 'Uploaded' : st.status === 'draft' ? 'Draft in Horizon' : 'Not yet', met: ['uploaded', 'draft'].includes(st.status), why: 'Most competitive applications ask you to explain your goals in writing.', action: { label: 'Start a draft', to: '/essays/new' } });
  if (abroad) {
    const id = docStatus(state, 'id');
    add({ key: 'passport', area: 'Documents', title: 'Valid passport', need: 'A passport for travel and visas', have: id.status === 'uploaded' ? 'Uploaded' : id.status === 'declared' ? 'You have it, not uploaded' : 'Not yet', met: id.status === 'uploaded', why: 'Study abroad and some scholarship applications need it.', action: { label: 'Upload ID', to: '/documents?upload=1&category=identity' } });
    add({ key: 'language', area: 'Requirements', title: 'English proficiency', need: 'Test result or exemption, depending on programme', have: docStatus(state, 'language').status === 'uploaded' ? 'Uploaded' : 'Not yet', met: docStatus(state, 'language').status === 'uploaded', why: 'Some programmes need IELTS/TOEFL; others accept a letter showing you studied in English. Check each programme.', action: { label: 'Mark as handled', override: true }, canSkip: true });
  }
  const met = items.filter((i) => i.met).length;
  return { items, met, total: items.length, pct: Math.round((met / items.length) * 100), open: items.filter((i) => !i.met) };
}

/* ---------- matching ---------- */
const FIELD_MAP = [
  ['Computer science & tech', /(computer|software|information tech|\bict\b|data|cyber|\bai\b|artificial|machine learning|comput)/i],
  ['Engineering', /engineer/i],
  ['STEM', /(science|math|physics|chemistry|biology|statistic|engineer|computer)/i],
  ['Health & medicine', /(medic|health|nurs|pharm|anatomy|physiology|dent)/i],
  ['Business & economics', /(business|econom|financ|account|management|marketing|banking)/i],
  ['Law & policy', /(law|legal|policy|political|international relations)/i],
  ['Agriculture & environment', /(agric|environment|climate|forestry|geograph|energy)/i],
  ['Arts & humanities', /(art|literature|english|history|philosophy|language|mass comm|journalism|theatre|music)/i],
  ['Education', /education|teaching/i],
];
export const studentFields = (p) => FIELD_MAP.filter(([, re]) => re.test(`${p?.course || ''} ${p?.goal?.field || ''}`)).map(([f]) => f);

const TYPE_FIT = {
  'study-abroad': ['Scholarship', 'Fellowship', 'Programme'],
  scholarship: ['Scholarship', 'Essay competition', 'Grant'],
  internship: ['Internship', 'Programme'],
  job: ['Internship', 'Programme', 'Fellowship'],
  research: ['Grant', 'Fellowship', 'Conference', 'Scholarship'],
  leadership: ['Fellowship', 'Programme', 'Conference', 'Competition'],
};

export function matchOpportunity(opp, state) {
  const p = state.profile;
  if (!p || !opp) return { score: 0, reasons: [], cautions: [], label: '' };
  const reasons = []; const cautions = []; let score = 0;
  const g = p.goal || {};
  const undergrad = /^\d+$/.test(p.level);

  if (opp.levels?.length) {
    if (undergrad && opp.levels.includes('Undergraduate')) { score += 30; reasons.push(`It mentions undergraduate students, and you're in ${p.level} Level.`); }
    else if (p.level === 'secondary' && opp.levels.includes('Secondary school')) { score += 30; reasons.push("It's aimed at secondary school students, which matches your stage."); }
    else if (['masters', 'graduate'].includes(p.level) && opp.levels.includes('Masters')) { score += 30; reasons.push("It mentions master's-level study, which fits where you are."); }
    else if (p.level === 'phd' && opp.levels.includes('PhD')) { score += 30; reasons.push('It mentions doctoral study, which fits where you are.'); }
    else if (/master/i.test(g.targetLevel || '') && opp.levels.includes('Masters')) { score += 20; reasons.push("It supports master's study, which is what you're working toward."); }
    else cautions.push(`The listing mentions ${opp.levels.join(' / ').toLowerCase()} level. Check this applies to you.`);
  }
  const myFields = studentFields(p);
  const fieldHit = (opp.fields || []).filter((f) => myFields.includes(f));
  if (fieldHit.length) { score += 25; reasons.push(`It relates to ${fieldHit[0].toLowerCase()}, which connects to ${p.course || 'your studies'}.`); }
  else if (!opp.fields?.length) score += 8; // open field listings are often general

  if (p.country && opp.locations?.includes(p.country)) { score += 15; reasons.push(`The listing mentions ${p.country}, where you're from.`); }
  else if (opp.africaWide && AFRICAN.has(p.country)) { score += 12; reasons.push('The listing refers to Africa or African students.'); }
  const destHit = (opp.locations || []).filter((l) => (p.destinations || []).includes(l));
  if (destHit.length) { score += 10; reasons.push(`It mentions ${destHit[0]}, one of your target destinations.`); }
  if ((TYPE_FIT[g.type] || []).includes(opp.type)) { score += 15; reasons.push(`${opp.type === 'Opportunity' ? 'This kind of opportunity' : `A ${opp.type.toLowerCase()}`} fits your goal to ${goalVerb(g.type)}.`); }

  const reqs = requirementsFor(state, opp);
  const ready = reqs.filter((r) => ['uploaded', 'built'].includes(r.status)).length;
  if (reqs.length) { score += Math.round((ready / reqs.length) * 5); if (ready) reasons.push(`You already have ${ready} of the ${reqs.length} listed documents ready.`); }

  for (const e of opp.eligibility || []) {
    if (cautions.length >= 3) break;
    if (/(final.year|graduat|women|female|girl|cgpa|gpa|first class|second class|2:1|age|years old|citizen|resident|indigene|state of origin|disab|income|financial need)/i.test(e)) cautions.push(`Check: “${e.length > 140 ? e.slice(0, 137) + '…' : e}”`);
  }
  const d = deadlineInfo(opp);
  if (d.closed) score -= 40;

  const label = score >= 55 ? 'Strong match' : score >= 30 ? 'Possible match' : 'Worth a look';
  return { score, reasons, cautions, label, reqs, ready };
}
function goalVerb(t) {
  return { 'study-abroad': 'study abroad', scholarship: 'win scholarships', internship: 'land an internship', job: 'get a graduate role', research: 'go into research', leadership: 'grow as a leader' }[t] || 'reach your goal';
}

/* ---------- application readiness ---------- */
export function readiness(state, app) {
  const opp = app.opp;
  const prof = profileCompleteness(state);
  const reqs = requirementsFor(state, opp);
  const items = [];
  items.push({ key: 'profile', label: 'Profile', ok: prof.pct >= 80, detail: `${prof.pct}% complete`, to: '/profile' });
  const cv = docStatus(state, 'cv');
  items.push({ key: 'cv', label: 'CV', ok: ['uploaded', 'built'].includes(cv.status), detail: cv.status === 'uploaded' ? 'In your vault' : cv.status === 'built' ? 'Built in Horizon' : 'Not ready', to: cv.status === 'missing' || cv.status === 'declared' ? '/cv' : cv.status === 'uploaded' ? `/documents?open=${cv.doc.id}` : '/cv' });
  const seen = new Set(['cv']);
  for (const r of reqs) {
    if (r.key && seen.has(r.key)) continue;
    if (r.key) seen.add(r.key);
    const ok = ['uploaded', 'built'].includes(r.status) || app.checks?.[r.text];
    const kind = r.key ? docKind(r.key) : null;
    items.push({
      key: r.key || r.text, label: kind ? kind.label : r.text, source: r.text, ok,
      manual: !r.key || r.key === 'photo' || r.key === 'admission',
      detail: ok ? (app.checks?.[r.text] && r.status !== 'uploaded' ? 'Marked as ready' : r.status === 'uploaded' ? 'In your vault' : 'Ready') : r.status === 'draft' ? 'Draft started' : r.status === 'declared' ? 'You have it — upload it' : 'Missing',
      to: r.key === 'statement' ? (app.essayIds?.length ? `/essays/${app.essayIds[0]}` : `/essays/new?app=${app.id}`) : kind ? `/documents?upload=1&category=${kind.cat}` : null,
      docId: r.doc?.id,
    });
  }
  if (!seen.has('transcript') && !reqs.length) {
    const tr = docStatus(state, 'transcript');
    items.push({ key: 'transcript', label: 'Transcript', ok: tr.status === 'uploaded', detail: tr.status === 'uploaded' ? 'In your vault' : 'Missing', to: '/documents?upload=1&category=academic' });
  }
  if (!seen.has('statement') && !reqs.length) {
    const hasEssay = app.essayIds?.length > 0;
    items.push({ key: 'statement', label: 'Personal statement', ok: hasEssay, detail: hasEssay ? 'Draft saved' : 'Not started', to: hasEssay ? `/essays/${app.essayIds[0]}` : `/essays/new?app=${app.id}` });
  }
  const ok = items.filter((i) => i.ok).length;
  return { items, ok, total: items.length, pct: Math.round((ok / items.length) * 100), complete: items.filter((i) => i.ok), missing: items.filter((i) => !i.ok) };
}

/* ---------- nudges ---------- */
export function nudges(state) {
  if (!state.settings?.nudges) return [];
  const out = [];
  const now = Date.now();
  const active = (id) => !(state.dismissedNudges?.[id] > now);
  const appsByOpp = new Map(state.applications.map((a) => [a.oppId, a]));

  for (const a of state.applications) {
    if (!ACTIVE_STATUSES.includes(a.status)) continue;
    const d = daysUntil(a.opp.deadline);
    if (d !== null && d >= 0 && d <= 14) out.push({ id: `deadline-${a.id}-${a.opp.deadline}`, tone: 'urgent', title: `${a.opp.title} closes in ${d === 0 ? 'less than a day' : `${d} day${d === 1 ? '' : 's'}`}.`, body: 'Finish your materials and submit before the deadline.', action: { label: 'Open application', to: `/applications/${a.id}` } });
    const r = readiness(state, a);
    const cvOk = r.items.find((i) => i.key === 'cv')?.ok;
    const stMissing = r.items.find((i) => i.key === 'statement' && !i.ok);
    if (cvOk && stMissing) out.push({ id: `statement-${a.id}`, tone: 'info', title: `Your CV is ready, but your personal statement for ${a.opp.title} is missing.`, body: 'Start a draft using your own profile details.', action: { label: 'Start draft', to: `/essays/new?app=${a.id}` } });
  }
  for (const { opp, savedAt } of Object.values(state.saved)) {
    if (appsByOpp.has(opp.id)) continue;
    const d = daysUntil(opp.deadline);
    if (d !== null && d >= 0 && d <= 21) out.push({ id: `saved-deadline-${opp.id}`, tone: 'urgent', title: `Your saved opportunity ${opp.title} closes in ${d} day${d === 1 ? '' : 's'}.`, body: "You haven't started this application yet.", action: { label: 'Prepare application', to: `/opportunities/${opp.id}?prepare=1` } });
    else if (now - savedAt > 2 * 864e5 && (d === null || d > 0)) out.push({ id: `saved-${opp.id}`, tone: 'info', title: `You saved ${opp.title} but haven't started the application.`, body: 'Check your readiness to see what you still need.', action: { label: 'Review readiness', to: `/opportunities/${opp.id}` } });
  }
  const rp = roadmapProgress(state.roadmap);
  if (rp.current && rp.currentOpen.length >= 3) out.push({ id: `roadmap-${rp.current.key}-${rp.currentOpen.length}`, tone: 'info', title: `Your roadmap has ${rp.currentOpen.length} incomplete tasks in ${rp.current.label}.`, body: `Start with “${rp.currentOpen[0].title}”.`, action: { label: 'Open roadmap', to: '/roadmap' } });
  if (!state.documents.length) out.push({ id: 'vault-empty', tone: 'info', title: 'Your document vault is empty.', body: 'Upload your CV and results once, and use them in every application.', action: { label: 'Upload document', to: '/documents?upload=1' } });

  const order = { urgent: 0, info: 1 };
  return out.filter((n) => active(n.id)).sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 3);
}

/* ---------- next best action ---------- */
export function nextAction(state) {
  const p = state.profile || {};
  const gaps = gapAnalysis(state);
  const prof = profileCompleteness(state);
  const soon = state.applications
    .filter((a) => ACTIVE_STATUSES.includes(a.status) && daysUntil(a.opp.deadline) !== null && daysUntil(a.opp.deadline) >= 0)
    .sort((a, b) => daysUntil(a.opp.deadline) - daysUntil(b.opp.deadline))[0];
  if (soon && daysUntil(soon.opp.deadline) <= 10) {
    return { title: `Finish your application to ${soon.opp.title}`, why: `It closes in ${daysUntil(soon.opp.deadline)} days. Check what's still missing and submit on time.`, action: { label: 'Continue application', to: `/applications/${soon.id}` } };
  }
  if (prof.pct < 60) {
    const m = prof.missing[0];
    return { title: `Complete your profile: add ${m.label.toLowerCase()}`, why: 'Horizon matches opportunities and drafts applications using your profile. The more complete it is, the more useful it gets.', action: { label: 'Complete your profile', to: m.to } };
  }
  const lead = gaps.items.find((i) => i.key === 'leadership' && !i.met);
  if (lead && ['study-abroad', 'scholarship', 'leadership', 'research'].includes(p.goal?.type)) {
    return { title: 'Add one leadership experience to your profile', why: 'Some of your target opportunities value leadership experience. Even a small role, like leading a study group or a club project, counts.', action: { label: 'Add Experience', to: '/profile?add=leadership' } };
  }
  const cv = gaps.items.find((i) => i.key === 'cv' && !i.met);
  if (cv) return { title: 'Create your CV', why: 'A CV is requested by almost every opportunity. Horizon builds it from what you have already added.', action: cv.action };
  if (!Object.keys(state.saved).length) return { title: 'Save your first opportunities', why: 'Saving opportunities early shows you exactly what they require, so you can prepare in time.', action: { label: 'Find Opportunities', to: '/opportunities' } };
  const rp = roadmapProgress(state.roadmap);
  const task = rp.currentOpen.find((t) => t.priority === 'High') || rp.currentOpen[0];
  if (task) return { title: task.title, why: task.why, action: task.action || { label: 'Open roadmap', to: '/roadmap' }, taskId: task.id };
  const gap = gaps.open[0];
  if (gap) return { title: gap.title, why: gap.why, action: gap.action.override ? { label: 'Review gaps', to: '/roadmap#gaps' } : gap.action };
  return { title: 'Look for new opportunities', why: "You're on track. Keep an eye out for new opportunities that fit your goal.", action: { label: 'Find Opportunities', to: '/opportunities' } };
}

export function declaredDocLabel(key) { return DECLARABLE_DOCS.find((d) => d.key === key)?.label || key; }
