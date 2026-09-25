// Horizon's built-in draft composer. It only ever uses the student's own profile, experiences,
// skills and answers. Anything missing becomes a visible [Add: …] prompt, never an invented fact.
import { expLabel } from './constants.js';
import { goalSummary } from './roadmap.js';
import { levelLabel } from './insights.js';

export const wordCount = (t) => (String(t || '').trim().match(/\S+/g) || []).length;
const end = (s) => { s = String(s || '').trim(); return s && !/[.!?]$/.test(s) ? s + '.' : s; };
const lcFirst = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);
const dates = (e) => {
  const f = (d) => (d ? new Date(d + '-01T12:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '');
  if (!e.start) return '';
  return e.current ? `since ${f(e.start)}` : e.end ? `${f(e.start)} – ${f(e.end)}` : f(e.start);
};

export function detectIntent(q) {
  const s = String(q || '').toLowerCase();
  if (/lead|initiative|responsib|organis|organiz/.test(s)) return 'leadership';
  if (/challenge|obstacle|difficult|fail|adversity|setback/.test(s)) return 'challenge';
  if (/community|impact|society|volunteer|contribut|give back/.test(s)) return 'community';
  if (/why (this|our|the)|why should we|why are you applying|why do you want to (join|attend|apply)/.test(s)) return 'why';
  if (/goal|future|career|plan|aspir|vision|where do you see/.test(s)) return 'goals';
  return 'statement';
}

export const INTENT_LABEL = { leadership: 'Leadership', challenge: 'Overcoming a challenge', community: 'Community impact', why: 'Why this opportunity', goals: 'Goals and plans', statement: 'Personal statement' };

// Questions Horizon asks when the student's profile doesn't contain what the essay needs.
export function missingQuestions(state, { question, opp }, answers = {}) {
  const intent = detectIntent(question);
  const ex = state.experiences;
  const qs = [];
  if (!answers.motivation) qs.push({ key: 'motivation', optional: true, label: `What first got you interested in ${state.profile?.goal?.field || state.profile?.course || 'your field'}?`, hint: 'A real moment or reason, in a sentence or two.' });
  if (!state.profile?.goal?.text && !answers.goal) qs.push({ key: 'goal', label: 'In your own words, what do you want to do next, and why?', hint: 'For example: the kind of work, the problem you care about, where you want to be.' });
  if (intent === 'leadership' && !ex.some((e) => e.type === 'leadership') && !answers.leadership) qs.push({ key: 'leadership', label: 'Describe a time you led or organised something, even informally.', hint: 'What was it, what did you do, and what happened as a result?' });
  if (intent === 'challenge' && !answers.challenge) qs.push({ key: 'challenge', label: 'Describe a real challenge you faced and how you handled it.', hint: 'What happened, what you did, and what changed afterwards.' });
  if (intent === 'community' && !ex.some((e) => ['volunteering', 'research'].includes(e.type)) && !answers.community) qs.push({ key: 'community', label: 'Describe something you have done that helped other people or your community.', hint: 'Be specific about who it helped and how.' });
  if (opp && !answers.whyOpp) qs.push({ key: 'whyOpp', optional: intent !== 'why', label: `What specifically about ${opp.title} appeals to you?`, hint: 'Something from the listing that connects to your goal.' });
  return qs;
}

const RELEVANCE = {
  leadership: ['leadership', 'volunteering', 'project', 'work', 'internship', 'competition'],
  challenge: ['project', 'competition', 'research', 'work', 'internship'],
  community: ['volunteering', 'leadership', 'research', 'project'],
  goals: ['project', 'research', 'internship', 'work', 'certification', 'leadership'],
  why: ['project', 'research', 'internship', 'leadership', 'competition'],
  statement: ['project', 'research', 'internship', 'work', 'leadership', 'competition', 'award', 'volunteering', 'certification'],
};

function evidenceSentence(e, v) {
  const where = e.org ? ` at ${e.org}` : '';
  const when = dates(e) ? ` (${dates(e)})` : '';
  const desc = e.description ? ' ' + end(e.description) : ` [Add: one or two sentences on what you did and what came of it.]`;
  switch (e.type) {
    case 'project': return (v % 2 ? `One project I am proud of is ${e.title}${when}.` : `I worked on ${e.title}${where}${when}.`) + desc;
    case 'leadership': return `I served as ${e.title}${where}${when}.` + desc;
    case 'internship': case 'work': return `I worked as ${e.title}${where}${when}.` + desc;
    case 'research': return `I have been involved in research: ${e.title}${where}${when}.` + desc;
    case 'volunteering': return `Outside class, I volunteered as ${e.title}${where}${when}.` + desc;
    case 'competition': return `I took part in ${e.title}${where}${when}.` + desc;
    case 'award': return `I received ${e.title}${where}${when}.` + desc;
    case 'certification': return `I completed ${e.title}${where}${when}.` + desc;
    default: return `${expLabel(e.type)}: ${e.title}${where}${when}.` + desc;
  }
}

export function studentFacts(state) {
  const p = state.profile || {};
  const lines = [
    `Name: ${p.name || 'not given'}`,
    `Level: ${levelLabel(p)}${p.programmeLength ? ` of a ${p.programmeLength}-year programme` : ''}`,
    `Course: ${p.course || 'not given'}`, `Institution: ${p.institution || 'not given'}`, `Country: ${p.country || 'not given'}`,
    p.cgpa && !p.cgpaNA ? `CGPA: ${p.cgpa}${p.cgpaScale ? ` out of ${p.cgpaScale}` : ''}` : 'CGPA: not given',
    `Goal: ${goalSummary(p)}${p.goal?.targetLevel ? ` (${p.goal.targetLevel})` : ''}`,
    `Target destinations: ${(p.destinations || []).join(', ') || 'not given'}`,
    `Skills: ${state.skills.map((s) => s.name).join(', ') || 'none listed'}`,
    'Experiences:',
    ...state.experiences.map((e) => `- [${expLabel(e.type)}] ${e.title}${e.org ? ` at ${e.org}` : ''}${dates(e) ? ` (${dates(e)})` : ''}: ${e.description || 'no description given'}`),
  ];
  return lines.join('\n');
}

export function oppFacts(opp) {
  if (!opp) return '';
  return [
    `Title: ${opp.title}`, opp.provider && `Provider: ${opp.provider}`, `Type: ${opp.type}`,
    opp.description && `Description: ${opp.description}`,
    opp.eligibility?.length && `Eligibility: ${opp.eligibility.join('; ')}`,
    opp.requiredDocuments?.length && `Required documents: ${opp.requiredDocuments.join('; ')}`,
  ].filter(Boolean).join('\n');
}

export function composeDraft(state, { question, wordLimit, tone = 'confident', opp, instructions }, answers = {}, variant = 0) {
  const p = state.profile || {};
  const g = p.goal || {};
  const intent = detectIntent(question);
  const target = g.field || p.course || 'my field';
  const goalText = answers.goal || g.text || goalSummary(p);
  const limit = Number(wordLimit) || 500;

  // 1. Opening
  const who = `${p.level && /^\d+$/.test(p.level) ? `${p.level}-level` : levelLabel(p).toLowerCase()} ${p.course || '[Add: your course]'} student at ${p.institution || '[Add: your institution]'}`;
  const opening = [];
  if (variant % 3 === 1) {
    opening.push(end(answers.motivation || `[Add: the moment or reason you became interested in ${target}]`));
    opening.push(`Today I am a ${who}, and my goal is clear: ${lcFirst(end(goalText))}`);
  } else if (variant % 3 === 2) {
    opening.push(`My goal is to ${lcFirst(end(goalText.replace(/^(i want to|to)\s+/i, '')))}`);
    opening.push(`I am working toward it as a ${who}.`);
    if (answers.motivation) opening.push(end(answers.motivation));
  } else {
    opening.push(`I am a ${who}${p.country ? ` in ${p.country}` : ''}.`);
    if (answers.motivation) opening.push(end(answers.motivation));
    opening.push(`My goal is to ${lcFirst(end(goalText.replace(/^(i want to|to)\s+/i, '')))}`);
  }
  if (p.cgpa && !p.cgpaNA && (intent === 'statement' || intent === 'goals') && tone !== 'warm') opening.push(`I currently hold a CGPA of ${p.cgpa}${p.cgpaScale ? ` on a ${p.cgpaScale}-point scale` : ''}.`);

  // 2. Evidence
  const order = RELEVANCE[intent];
  const exps = [...state.experiences].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type)).filter((e) => order.includes(e.type));
  const evidence = [];
  if (intent === 'leadership' && answers.leadership) evidence.push(end(answers.leadership));
  if (intent === 'challenge') evidence.push(end(answers.challenge || '[Add: a real challenge you faced, what you did about it, and what changed as a result.]'));
  if (intent === 'community' && answers.community) evidence.push(end(answers.community));
  const maxExp = limit < 300 ? 1 : limit < 550 ? 2 : 3;
  exps.slice(0, maxExp).forEach((e, i) => evidence.push(evidenceSentence(e, variant + i)));
  if (!evidence.length) evidence.push(`[Add: a specific project, role or experience that shows your interest in ${target}. Horizon doesn't have one on your profile yet.]`);
  const skills = state.skills.map((s) => s.name).slice(0, 5);
  const skillLine = skills.length ? (variant % 2 ? `The skills I rely on most are ${list(skills)}.` : `Along the way I have been building skills in ${list(skills)}.`) : '';

  // 3. Fit with the opportunity
  const fit = [];
  if (opp) {
    fit.push(`I am applying to ${opp.title}${opp.provider ? `, offered by ${opp.provider},` : ''} because ${lcFirst(end(answers.whyOpp || '[Add: what specifically about this opportunity fits your goal]'))}`);
    fit.push(`It would help me move toward my goal to ${lcFirst(end(goalText.replace(/^(i want to|to)\s+/i, '')))}`);
  } else if (intent === 'goals' || intent === 'statement') {
    fit.push(`[Add: what you plan to do next and how this application helps you get there.]`);
  }
  if (instructions && /mention|include/i.test(instructions)) fit.push(`[Add: ${instructions.trim()}]`);

  // 4. Closing (no claims, only intent)
  const closings = {
    confident: `I have started building toward this early, and I intend to keep going.`,
    warm: `This goal matters to me, and I am committed to working steadily toward it.`,
    formal: `I would welcome the opportunity to continue this work with your support.`,
  };
  const closing = closings[tone] || closings.confident;

  let paras = [opening.join(' '), [...evidence, skillLine].filter(Boolean).join(' '), fit.join(' '), closing].filter((x) => x.trim());
  let text = paras.join('\n\n');
  if (wordCount(text) > limit) text = shorten(text, limit);
  return { text, intent };
}

const splitSentences = (p) => p.match(/[^.!?\]]+(?:[.!?]+|\])["”']?\s*|[^.!?\]]+$/g)?.map((s) => s.trim()).filter(Boolean) || [p];

export function shorten(text, limit) {
  const current = wordCount(text);
  const target = Math.min(Number(limit) || Infinity, Math.max(40, Math.round(current * 0.8)));
  let paras = text.split(/\n{2,}/).map(splitSentences);
  let guard = 0;
  while (paras.flat().join(' ').split(/\s+/).length > target && guard++ < 200) {
    // remove the longest non-opening sentence from the longest paragraph that has more than one sentence
    let best = null;
    paras.forEach((ss, pi) => ss.forEach((s, si) => {
      if (ss.length === 1 || (pi === 0 && si === 0)) return;
      const w = wordCount(s) + (s.startsWith('Along the way') || s.startsWith('The skills') ? 30 : 0);
      if (!best || w > best.w) best = { pi, si, w };
    }));
    if (!best) break;
    paras[best.pi].splice(best.si, 1);
  }
  let out = paras.filter((p) => p.length).map((p) => p.join(' ')).join('\n\n');
  if (wordCount(out) > target) { // last resort: cut at a sentence end within the limit
    const words = out.split(/(\s+)/); let n = 0; let acc = '';
    for (const w of words) { if (/\S/.test(w)) n++; if (n > target) break; acc += w; }
    out = acc.replace(/[^.!?\]]*$/, '').trim() || acc.trim();
  }
  return out;
}

const FILLERS = [
  [/\bin order to\b/gi, 'to'], [/\bdue to the fact that\b/gi, 'because'], [/\bat this point in time\b/gi, 'now'],
  [/\bhas the ability to\b/gi, 'can'], [/\ba lot of\b/gi, 'many'], [/\bvery\s+/gi, ''], [/\breally\s+/gi, ''],
  [/\bbasically,?\s+/gi, ''], [/\bactually,?\s+/gi, ''], [/\bjust\s+(?=\w)/gi, ''], [/\bI believe that\s+/g, ''],
  [/\bit is important to note that\s+/gi, ''], [/\bthe fact that\b/gi, 'that'], [/\s+,/g, ','], [/ {2,}/g, ' '],
];

export function improveClarity(text) {
  let changes = 0;
  let out = text;
  for (const [re, rep] of FILLERS) out = out.replace(re, (m) => { if (m !== rep) changes++; return rep; });
  out = out.split(/\n{2,}/).map((para) => splitSentences(para).map((s) => {
    if (wordCount(s) <= 30 || s.startsWith('[')) return s;
    const idx = s.search(/,\s+(and|but|which|so)\s+/);
    if (idx > 40) {
      changes++;
      const rest = s.slice(idx + 1).trim().replace(/^(and|but|which|so)\s+/, (w) => (w.trim() === 'which' ? 'This ' : w.trim() === 'but' ? 'However, ' : ''));
      return `${s.slice(0, idx)}. ${rest[0].toUpperCase()}${rest.slice(1)}`;
    }
    return s;
  }).join(' ')).join('\n\n');
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  return { text: out, changes };
}

export function expand(state, text, { wordLimit }) {
  const lower = text.toLowerCase();
  const unused = state.experiences.filter((e) => !lower.includes(e.title.toLowerCase()));
  const add = [];
  unused.slice(0, 2).forEach((e, i) => add.push(evidenceSentence(e, i)));
  const unusedSkills = state.skills.map((s) => s.name).filter((s) => !lower.includes(s.toLowerCase()));
  if (!add.length && unusedSkills.length) add.push(`I have also been developing ${list(unusedSkills.slice(0, 4))}.`);
  let added = add.length > 0;
  if (!add.length) add.push('[Add: a specific example, with what you did and what changed as a result.]', '[Add: what you learned from it and how it connects to your goal.]');
  const paras = text.split(/\n{2,}/);
  paras.splice(Math.max(1, paras.length - 1), 0, add.join(' '));
  let out = paras.join('\n\n');
  if (wordLimit && wordCount(out) > Number(wordLimit)) out = shorten(out, Number(wordLimit));
  return { text: out, usedProfile: added };
}

export const placeholders = (t) => (String(t).match(/\[Add:[^\]]*\]/g) || []);
