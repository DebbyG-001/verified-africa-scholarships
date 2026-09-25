// Course Intelligence content. Every item carries a clear basis label:
//  - "research": supported by published learning-science research (source named)
//  - "guide": Horizon's general guidance; your department's syllabus and rules may differ
//  - community notes are the student's own saved notes and are always labelled as opinion
import { IMG } from './images.js';

export const STRATEGIES = [
  { title: 'Test yourself instead of rereading', body: 'Close the notes and try to recall or solve without looking, then check. Past questions and flashcards work well for this.', source: 'Dunlosky et al. (2013), “Improving Students’ Learning With Effective Learning Techniques”, Psychological Science in the Public Interest — rated practice testing as high utility.' },
  { title: 'Spread study over time', body: 'Several shorter sessions across days beat one long session the night before. Plan reviews one day, one week and a few weeks after learning something.', source: 'Dunlosky et al. (2013) — rated distributed practice as high utility; also Cepeda et al. (2006), Psychological Bulletin.' },
  { title: 'Mix problem types', body: 'When practising, mix different kinds of problems instead of doing twenty of the same kind in a row. It feels harder but improves your ability to choose the right method.', source: 'Dunlosky et al. (2013) — rated interleaved practice as moderate utility; Rohrer & Taylor (2007).' },
  { title: 'Explain it in your own words', body: 'Ask yourself why a step works and how it connects to what you already know. Teaching a friend is a good test.', source: 'Dunlosky et al. (2013) — rated elaborative interrogation and self-explanation as moderate utility.' },
  { title: 'Highlighting alone is not enough', body: 'Highlighting and rereading feel productive but, on their own, do little for long-term memory. Pair them with self-testing.', source: 'Dunlosky et al. (2013) — rated highlighting and rereading as low utility.' },
];

export const GUIDES = [
  {
    slug: 'programming-fundamentals', title: 'Introduction to Programming', area: 'Computer Science', level: '100–200 Level', img: IMG.coding,
    summary: 'Your first programming courses set the pace for the rest of the degree.',
    tips: ['Type out and run every example, then change it and predict what happens.', 'Practise a little every day. Programming is a skill, not a topic you memorise.', 'Learn to read error messages carefully. They usually tell you the line and the problem.'],
    mistakes: ['Copying solutions without understanding them.', 'Waiting until the week of the test to start practising.', 'Only studying on paper for a course that is about writing working code.'],
    survival: ['Keep a folder of small programs you wrote, with notes. It becomes your first portfolio.', 'Find a study partner and review each other’s code.', 'When stuck for more than 30 minutes, write down exactly what you tried and ask for help.'],
  },
  {
    slug: 'data-structures-algorithms', title: 'Data Structures & Algorithms', area: 'Computer Science', level: '200–300 Level', img: IMG.codeScreen,
    summary: 'Core to technical interviews and to most advanced CS courses.',
    tips: ['Draw the data structure before writing code: boxes, arrows, indexes.', 'For every algorithm, learn when to use it and its time complexity, not just the steps.', 'Implement each structure yourself at least once (list, stack, queue, tree, hash table).'],
    mistakes: ['Memorising code instead of understanding the idea.', 'Skipping complexity analysis because it “isn’t coding”.', 'Practising only easy problems.'],
    survival: ['Work through problems by pattern (two pointers, recursion, graph search) rather than randomly.', 'Explain your solution out loud as if in an interview.', 'Revisit problems you got wrong after a few days.'],
  },
  {
    slug: 'discrete-mathematics', title: 'Discrete Mathematics', area: 'Computer Science / Mathematics', level: '100–200 Level', img: IMG.books,
    summary: 'Logic, sets, proofs and counting — the language behind algorithms.',
    tips: ['Write proofs step by step, justifying each line.', 'Make a sheet of definitions and know them exactly; many marks depend on precise definitions.', 'Practise many small counting and logic problems rather than a few long ones.'],
    mistakes: ['Treating proofs as something to memorise.', 'Skipping the tutorials and worked examples.'],
    survival: ['Form a proof-reading group where you check each other’s arguments.', 'Use past questions to learn the common question styles in your department.'],
  },
  {
    slug: 'calculus-linear-algebra', title: 'Calculus & Linear Algebra', area: 'Mathematics', level: '100–200 Level', img: IMG.lecture,
    summary: 'Essential for engineering, physics, statistics and machine learning.',
    tips: ['Do the exercises by hand; watching someone solve problems is not the same as solving them.', 'For linear algebra, connect the calculations to the geometric picture (vectors, transformations).', 'Keep a list of the mistakes you make and review it before tests.'],
    mistakes: ['Relying on memorised formulas without knowing when they apply.', 'Falling behind early; later topics build directly on earlier ones.'],
    survival: ['Attend every tutorial, even if attendance is not marked.', 'If you plan to study AI or data science, treat linear algebra as a core course for your goal, not just a requirement.'],
  },
  {
    slug: 'intro-machine-learning', title: 'Introduction to Machine Learning', area: 'Computer Science / AI', level: '300–400 Level', img: IMG.ai,
    summary: 'Where maths, programming and data meet. A strong base for AI study abroad.',
    tips: ['Make sure your linear algebra, probability and Python basics are solid first.', 'Reproduce a simple model from scratch before using a library.', 'Always ask how a model will be evaluated, and on what data.'],
    mistakes: ['Jumping straight to deep learning without the fundamentals.', 'Reporting results on the same data used for training.'],
    survival: ['Turn coursework into a documented project with a clear write-up. It’s strong evidence for applications.', 'Read the introduction and conclusion of one well-known paper per month to get used to research writing.'],
  },
  {
    slug: 'databases', title: 'Database Systems', area: 'Computer Science', level: '200–300 Level', img: IMG.teamwork,
    summary: 'Data modelling and SQL — useful in almost every tech internship.',
    tips: ['Practise writing SQL queries against a real small database you set up.', 'Draw entity–relationship diagrams before designing tables.', 'Understand normalisation by fixing badly designed tables.'],
    mistakes: ['Learning SQL syntax only on paper.', 'Ignoring indexes and query performance entirely.'],
    survival: ['Build a small app with a database for your portfolio.', 'Pair up for practice: one writes queries, the other checks results.'],
  },
  {
    slug: 'industrial-training', title: 'Industrial Training / SIWES', area: 'All courses', level: '300–400 Level', img: IMG.office,
    summary: 'Your placement can become your strongest CV entry if you plan it.',
    tips: ['Start looking for placements months before the period begins.', 'Keep a weekly log of tasks, tools and what you learned — you will need it for reports and your CV.', 'Ask your supervisor early whether they might act as a referee later.'],
    mistakes: ['Accepting a placement unrelated to your goals without considering alternatives.', 'Writing the logbook from memory at the end.'],
    survival: ['Ask for small, real responsibilities and follow through reliably.', 'Add the placement to your Horizon profile with specific outcomes as soon as it ends.'],
  },
  {
    slug: 'final-year-project', title: 'Final-Year Project', area: 'All courses', level: 'Final Year', img: IMG.library,
    summary: 'A chance to produce work that directly supports your next step.',
    tips: ['Pick a topic connected to your long-term goal.', 'Agree a realistic scope with your supervisor early.', 'Write as you go: a short weekly progress note makes the final report much easier.'],
    mistakes: ['Choosing a topic only because it seems easy.', 'Leaving the write-up to the last few weeks.'],
    survival: ['Keep regular meetings with your supervisor, even when progress is slow.', 'Present your project clearly in your portfolio and personal statement.'],
  },
  {
    slug: 'general-studies', title: 'General Studies Courses', area: 'All courses', level: '100–200 Level', img: IMG.classroom,
    summary: 'Often underestimated, but they count toward your CGPA.',
    tips: ['Treat them with the same seriousness as core courses; the grade points count the same way in your CGPA.', 'Use past questions to learn the question style.'],
    mistakes: ['Skipping classes because the course feels unrelated to your degree.'],
    survival: ['Study in groups and share notes, but test yourself individually.'],
  },
];

export const RUMOURS = [
  { claim: 'You need a first-class degree to get a scholarship abroad.', verdict: 'It depends', reality: 'Requirements vary by scholarship. Some state a minimum classification or GPA; many also weigh leadership, projects, essays and references. Read each listing’s eligibility rather than ruling yourself out.' },
  { claim: 'Your 100-level results don’t really matter.', verdict: 'Not true', reality: 'In a cumulative CGPA system, early results are part of your final average. Recovering from a weak start is possible but takes more effort later. Check your institution’s rules.' },
  { claim: 'Only final-year students can get internships.', verdict: 'Not true', reality: 'Many programmes are open to earlier-level students, especially summer and early-career schemes. Each listing sets its own eligibility.' },
  { claim: 'You have to pay an agent to win a scholarship.', verdict: 'Be careful', reality: 'Legitimate scholarships publish their own application process. Be cautious of anyone asking for payment to guarantee an award. Always apply through the official link.' },
  { claim: 'A lecturer will write a strong recommendation even if they barely know you.', verdict: 'Unlikely', reality: 'Strong letters include specific examples. Referees can only give those if they have seen your work over time.' },
  { claim: 'You can reuse one personal statement everywhere.', verdict: 'Partly', reality: 'Your core story can be reused, but each application should answer its own question and show fit with that specific opportunity.' },
  { claim: 'Certificates from online courses are worthless.', verdict: 'It depends', reality: 'On their own they carry limited weight. Paired with a project that shows you applied the skill, they become useful evidence.' },
];
