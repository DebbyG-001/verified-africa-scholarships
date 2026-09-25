// Builds a goal-backward roadmap from the student's goal, level and programme length.
import { AFRICAN } from './constants.js';

const TECH = /(computer|software|information|data|cyber|ai|artificial|machine|electrical|electronic|mechatronic|engineering|math|physics|statistics|tech)/i;

export function goalSummary(profile) {
  const g = profile?.goal || {};
  if (g.text) return g.text;
  const target = g.field || profile?.course || 'your field';
  const dest = (profile?.destinations || [])[0];
  switch (g.type) {
    case 'study-abroad': return `Study ${target}${dest ? ` in ${dest}` : ' abroad'}`;
    case 'scholarship': return `Win scholarships for ${target}`;
    case 'internship': return `Land an internship in ${target}`;
    case 'job': return `Get a graduate role in ${target}`;
    case 'research': return `Build a research path in ${target}`;
    case 'leadership': return 'Earn leadership fellowships and programmes';
    default: return 'Set your goal';
  }
}

export function stagesFor(profile) {
  const lvl = profile?.level;
  const len = Number(profile?.programmeLength) || 4;
  if (lvl === 'secondary') {
    return [
      { key: 's-now', label: 'This year', kind: 'foundation' },
      { key: 's-next', label: 'Before university', kind: 'build' },
      { key: 's-uni', label: 'First year at university', kind: 'deepen' },
    ].map((s, i) => ({ ...s, status: i === 0 ? 'current' : 'upcoming' }));
  }
  if (['graduate', 'masters', 'phd'].includes(lvl)) {
    return [
      { key: 'g-0', label: 'Next 3 months', kind: 'foundation', timeframe: 'Months 1–3' },
      { key: 'g-1', label: '3 to 6 months', kind: 'deepen', timeframe: 'Months 4–6' },
      { key: 'g-2', label: 'Application season', kind: 'apply', timeframe: 'Months 7–12' },
    ].map((s, i) => ({ ...s, status: i === 0 ? 'current' : 'upcoming' }));
  }
  const kindsByLen = {
    3: ['foundation', 'deepen', 'apply'],
    4: ['foundation', 'build', 'deepen', 'apply'],
    5: ['foundation', 'build', 'build2', 'deepen', 'apply'],
    6: ['foundation', 'build', 'build2', 'deepen', 'deepen2', 'apply'],
  };
  const kinds = kindsByLen[len] || kindsByLen[4];
  const current = Math.min(Math.max(Math.round(Number(lvl) / 100) || 1, 1), kinds.length);
  return kinds.map((kind, i) => {
    const n = (i + 1) * 100;
    const isFinal = i === kinds.length - 1;
    return {
      key: `l-${n}`,
      label: isFinal ? `Final Year · ${n} Level` : `${n} Level`,
      kind,
      status: i + 1 < current ? 'past' : i + 1 === current ? 'current' : 'upcoming',
    };
  });
}

function ctxFor(profile) {
  const g = profile?.goal || {};
  const field = profile?.course || 'your course';
  const target = g.field || field;
  const dests = profile?.destinations || [];
  const dest = dests.length ? dests.slice(0, 2).join(' or ') : 'your target country';
  const tech = TECH.test(`${field} ${target}`);
  const nigeria = profile?.country === 'Nigeria';
  const african = AFRICAN.has(profile?.country);
  return { type: g.type || 'study-abroad', field, target, dest, tech, nigeria, african };
}

const T = (key, title, explanation, why, timeframe, priority, action) => ({ key, title, explanation, why, timeframe, priority, action });

function templates(kind, c) {
  const proj = c.tech ? 'technical project' : 'portfolio piece';
  const common = {
    foundation: [
      T('academics', 'Build a strong academic foundation', `Aim for consistent results in your core ${c.field} courses. Set up a weekly study rhythm early instead of cramming.`, 'Your CGPA is cumulative, so early results carry into every later application.', 'Throughout the year', 'High', { label: 'Study strategies', to: '/learn' }),
      T('evidence', 'Start collecting certificates and evidence', 'Save results, certificates and awards in your document vault as soon as you get them.', 'Applications ask for proof. Having everything in one place saves stress later.', 'Start now', 'Medium', { label: 'Upload a document', to: '/documents?upload=1' }),
      T('explore', `Explore ${c.target} with a short introductory course`, `Pick one free or low-cost introductory course in ${c.target} and finish it.`, 'It helps you confirm your interest and gives you a first certificate.', 'Second semester', 'Medium', { label: 'Add a certification', to: '/profile?add=certification' }),
      T('lecturers', 'Get to know two lecturers', 'Visit office hours, ask thoughtful questions and let them see your work over time.', 'Strong recommendation letters come from people who actually know you.', 'Throughout the year', 'Medium'),
    ],
    build: [
      T('first-project', `Build your first ${proj}`, `Create something small but complete that relates to ${c.target}. Write down what you built and what you learned.`, 'Projects are the clearest evidence of skill for scholarships, programmes and employers.', 'This session', 'High', { label: 'Add a project', to: '/profile?add=project' }),
      T('community', `Join a ${c.field} community or club`, 'Join a student society, developer community or interest group and contribute regularly.', 'Communities lead to collaborators, mentors and leadership opportunities.', 'First semester', 'Medium', { label: 'Add volunteering or community work', to: '/profile?add=volunteering' }),
      T('document', 'Document achievements as they happen', 'Every time you finish a project, competition or role, add it to your profile the same week.', 'You will forget details. Fresh notes make stronger essays and CVs.', 'Ongoing', 'Medium', { label: 'Add experience', to: '/profile?add=project' }),
      T('targets', 'Identify target opportunities', `Save five to ten opportunities that fit your goal and note what they require.`, 'Knowing the requirements early tells you exactly what to build next.', 'This session', 'High', { label: 'Find opportunities', to: '/opportunities' }),
      T('cv-v1', 'Create the first version of your CV', 'Put your education, skills and early experience into a clean one-page CV.', 'A CV you update each semester is much easier than one written the night before a deadline.', 'By end of session', 'High', { label: 'Open CV builder', to: '/cv' }),
    ],
    build2: [
      T('team-project', 'Take on a bigger team project', `Work with others on a more ambitious ${proj} and own a clear part of it.`, 'Shows you can collaborate and deliver something substantial.', 'This session', 'High', { label: 'Add a project', to: '/profile?add=project' }),
      T('events', 'Attend a conference, workshop or hackathon', 'Pick one event in your field and take part, not just attend.', 'Builds your network and often leads to certificates or awards.', 'This session', 'Medium', { label: 'Add a competition', to: '/profile?add=competition' }),
      T('cv-refresh', 'Refresh your CV', 'Add everything from this year and remove weaker items.', 'Keeps you ready when a good opportunity appears at short notice.', 'End of each semester', 'Medium', { label: 'Open CV builder', to: '/cv' }),
    ],
    deepen: [
      T('strong-project', `Build a stronger ${proj} in ${c.target}`, `Go deeper: a project that solves a real problem, with a write-up or demo others can see.`, 'Selection panels look for depth and initiative, not just coursework.', 'This session', 'High', { label: 'Add a project', to: '/profile?add=project' }),
      T('internship', c.nigeria ? 'Secure an internship or SIWES placement' : 'Secure an internship', `Apply for internships or industrial training that relate to ${c.target}.`, 'Real work experience strengthens both career and study applications.', '6 months ahead', 'High', { label: 'Add an internship', to: '/profile?add=internship' }),
      T('research-community', 'Take part in research or community work', 'Assist on a research project or lead a community initiative connected to your field.', 'Many scholarships and programmes value research exposure and social impact.', 'This session', 'Medium', { label: 'Add research', to: '/profile?add=research' }),
      T('leadership', 'Take on a leadership responsibility', 'Lead a club, a project team, an event or a study group.', 'Leadership is a common selection criterion for scholarships and fellowships.', 'This session', 'Medium', { label: 'Add a leadership role', to: '/profile?add=leadership' }),
      T('statement-draft', 'Start drafting your personal statement', 'Write a rough first draft about your goals and the experiences behind them.', 'Good statements take several rounds. Starting early removes the pressure.', 'Second semester', 'Medium', { label: 'Open essay builder', to: '/essays/new' }),
      T('referees', 'Line up two or three referees', 'Tell your lecturers or supervisors about your plans and keep them updated on your work.', 'Referees write better letters when they know your goals in advance.', 'Second semester', 'High'),
    ],
    deepen2: [
      T('present', 'Present or publish your work', 'Share a project write-up, a talk, a poster or an article.', 'Public work is strong evidence and makes you easier to recommend.', 'This session', 'Medium', { label: 'Add a publication', to: '/profile?add=publication' }),
      T('mentor', 'Mentor a junior student', 'Help a student in a lower level with their studies or projects.', 'Shows leadership and gives you concrete examples for essays.', 'This session', 'Low'),
    ],
    apply: [
      T('portfolio', 'Finalise your portfolio', 'Choose your best three to five pieces of work and make them easy to view.', 'Your portfolio is often the first thing reviewers look at.', '3 months before deadlines', 'High', { label: 'Upload portfolio', to: '/documents?upload=1&category=career' }),
      T('recommendations', 'Request recommendation letters', 'Ask your referees at least six to eight weeks before the earliest deadline. Share your CV and goals with them.', 'Late requests lead to rushed letters, or none at all.', '6–8 weeks before deadlines', 'High', { label: 'Upload a letter', to: '/documents?upload=1&category=recommendations' }),
      T('transcript', 'Request your official transcript', 'Find out how your institution issues transcripts and how long it takes.', 'Transcripts can take weeks to process. Start early.', '2–3 months before deadlines', 'High', { label: 'Upload transcript', to: '/documents?upload=1&category=academic' }),
      T('prepare-apps', 'Prepare and tailor your applications', 'Tailor your statement and CV to each opportunity instead of reusing one version everywhere.', 'Tailored applications show genuine fit.', 'Application season', 'High', { label: 'Open applications', to: '/applications' }),
      T('final-project', `Align your final-year project with ${c.target}`, 'Choose a project topic that supports your long-term goal.', 'It becomes a strong talking point in essays and interviews.', 'Start of final year', 'Medium', { label: 'Add a project', to: '/profile?add=project' }),
    ],
  };

  const specific = {
    'study-abroad': {
      foundation: [T('learn-reqs', `Learn what ${c.target} programmes abroad look for`, `Look at a few programmes in ${c.dest} and note their entry requirements.`, 'Knowing the bar early shapes every choice you make from now on.', 'This session', 'High', { label: 'Find opportunities', to: '/opportunities' })],
      build: [T('shortlist', `Shortlist programmes in ${c.dest}`, 'Keep a shortlist of programmes with their requirements, costs and deadlines.', 'A clear shortlist turns a big goal into specific targets.', 'By end of session', 'High', { label: 'Save opportunities', to: '/opportunities' })],
      deepen: [
        T('english-test', 'Check English-test requirements', `See whether your target programmes in ${c.dest} need IELTS or TOEFL, or accept an English-proficiency letter.`, 'Tests need preparation time and booking in advance.', 'Second semester', 'Medium'),
        T('funding', `Research funding for study in ${c.dest}`, 'Identify scholarships that cover tuition and living costs for your target programmes.', 'Funding often has earlier deadlines than admission.', 'This session', 'High', { label: 'Find scholarships', to: '/opportunities?type=Scholarship' }),
      ],
      apply: [
        T('apply-programmes', 'Apply to your target programmes and scholarships', 'Submit applications before each deadline and track them in Horizon.', 'This is where the earlier years pay off.', 'Application season', 'High', { label: 'Track applications', to: '/applications' }),
        T('passport', 'Get your passport ready', 'Apply for or renew your passport so it is valid well beyond your intended study period.', 'Visa and some scholarship applications need a valid passport.', '6 months before travel', 'High', { label: 'Upload ID', to: '/documents?upload=1&category=identity' }),
      ],
    },
    scholarship: {
      foundation: [T('eligibility-docs', 'Gather eligibility documents', 'Collect identity documents and any certificates that prove your background and eligibility.', 'Many scholarships ask for these up front.', 'This session', 'Medium', { label: 'Upload ID', to: '/documents?upload=1&category=identity' })],
      build: [T('practice-apply', 'Apply to one smaller scholarship or essay competition', 'Treat it as practice: write, submit and learn from the process.', 'Experience with applications makes the big ones easier.', 'This session', 'High', { label: 'Find essay competitions', to: '/opportunities?type=Essay%20competition' })],
      apply: [T('apply-scholarships', 'Apply to your target scholarships', 'Submit tailored applications before each deadline.', 'Consistent, well-prepared applications improve your chances over time.', 'Application season', 'High', { label: 'Track applications', to: '/applications' })],
    },
    internship: {
      foundation: [T('cv-early', 'Create a simple CV', 'Even a short CV helps you apply to first opportunities.', 'Some internships are open to early-level students.', 'This session', 'High', { label: 'Open CV builder', to: '/cv' })],
      build: [T('first-role', 'Apply for a first internship or volunteer role', 'Look for student-friendly internships, volunteer tech roles or campus jobs.', 'Early experience makes later internships much easier to get.', 'This session', 'High', { label: 'Find internships', to: '/opportunities?type=Internship' })],
      deepen: [T('interview-prep', 'Practise interviews', 'Practise explaining your projects clearly, and technical questions if relevant.', 'Interviews are where most candidates stumble.', '2 months before applying', 'Medium')],
    },
    job: {
      build: [T('online-profile', 'Set up a professional online profile', 'Create a professional profile that mirrors your CV and shows your projects.', 'Recruiters check online presence.', 'This session', 'Medium')],
      deepen: [T('interview-prep', 'Practise interviews', 'Prepare stories for common questions using real examples.', 'Clear answers turn applications into offers.', '2 months before applying', 'Medium')],
      apply: [T('apply-roles', 'Apply to graduate roles', 'Target roles that fit your skills and track each application.', 'Graduate schemes often open early in the final year.', 'Final year', 'High', { label: 'Track applications', to: '/applications' })],
    },
    research: {
      foundation: [T('dept-research', 'Learn about research in your department', 'Find out what lecturers are researching and attend seminars.', 'Research opportunities usually come through people you know.', 'This session', 'Medium')],
      build: [T('assist-research', 'Ask to assist on a research project', 'Approach a lecturer whose work interests you and offer specific help.', 'Hands-on research is the strongest signal for a research path.', 'This session', 'High', { label: 'Add research', to: '/profile?add=research' })],
      apply: [T('supervisors', 'Contact potential supervisors', 'Identify supervisors whose research fits yours and write concise, specific emails.', 'Many postgraduate research places depend on supervisor interest.', 'Final year', 'High')],
    },
    leadership: {
      foundation: [T('small-role', 'Take on a small responsibility', 'Volunteer to organise something in a club or class.', 'Leadership starts with reliability in small roles.', 'This session', 'Medium', { label: 'Add a leadership role', to: '/profile?add=leadership' })],
      build: [T('lead-role', 'Take a leadership role in a club or project', 'Run for a position or start an initiative.', 'Fellowships look for evidence of initiative and impact.', 'This session', 'High', { label: 'Add a leadership role', to: '/profile?add=leadership' })],
      apply: [T('apply-fellowships', 'Apply to leadership fellowships', 'Submit tailored applications and track them.', 'This is where your record of impact counts.', 'Application season', 'High', { label: 'Find fellowships', to: '/opportunities?type=Fellowship' })],
    },
  };

  return [...(specific[c.type]?.[kind] || []), ...(common[kind] || [])];
}

export function buildRoadmap(profile, previous) {
  const c = ctxFor(profile);
  const stages = stagesFor(profile);
  const prevByKey = new Map((previous?.tasks || []).map((t) => [t.id, t]));
  const tasks = [];
  for (const s of stages) {
    for (const t of templates(s.kind, c)) {
      const id = `${s.key}:${t.key}`;
      const prev = prevByKey.get(id);
      tasks.push({
        id, stage: s.key, ...t,
        timeframe: s.timeframe ? `${s.timeframe} · ${t.timeframe}` : t.timeframe,
        done: prev?.done || false, doneAt: prev?.doneAt || null, notes: prev?.notes || '',
      });
    }
  }
  // keep student-added tasks, re-homing them if their stage no longer exists
  for (const t of previous?.tasks || []) {
    if (t.custom) tasks.push({ ...t, stage: stages.some((s) => s.key === t.stage) ? t.stage : (stages.find((s) => s.status === 'current') || stages[0]).key });
  }
  return { goal: goalSummary(profile), generatedAt: Date.now(), stages, tasks };
}

export function roadmapProgress(roadmap) {
  const tasks = roadmap?.tasks || [];
  const done = tasks.filter((t) => t.done).length;
  const cur = roadmap?.stages?.find((s) => s.status === 'current');
  const curTasks = tasks.filter((t) => t.stage === cur?.key);
  return {
    done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    current: cur, currentDone: curTasks.filter((t) => t.done).length, currentTotal: curTasks.length,
    currentOpen: curTasks.filter((t) => !t.done),
  };
}
