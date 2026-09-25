// Optional enhanced writing help. Runs only when ANTHROPIC_API_KEY is configured on the server.
// Without it, the browser uses Horizon's built-in draft composer, which assembles text only from
// the student's own profile.
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `You help a student draft application essays and personal statements.

Hard rules:
- Use ONLY facts contained in the STUDENT FACTS and OPPORTUNITY sections, plus the student's own current draft.
- Never invent achievements, grades, awards, projects, organisations, job titles, dates, numbers, people or leadership roles.
- If the question needs something the facts do not contain, write a clearly bracketed placeholder such as [Add: a specific example of ...] instead of making it up.
- Do not claim the student is eligible for the opportunity.
- Write in first person, in plain, specific, human language. No clichés like "ever since I was a child", no headings, no bullet points unless the student asked for them.
- Respect the word limit strictly when one is given.
- Return only the essay text. No preamble, no notes.`;

const TASKS = {
  generate: 'Write a first draft answering the question.',
  rewrite: 'Rewrite the current draft with fresh structure and wording. Keep every fact; add none.',
  shorten: 'Shorten the current draft by roughly a quarter (and to within the word limit). Keep the strongest specifics.',
  expand: 'Expand the current draft using facts from STUDENT FACTS that are not yet used. If none remain, add bracketed [Add: ...] prompts where more detail would help. Stay within the word limit.',
  clarity: 'Improve clarity: shorter sentences, active voice, remove filler and repetition. Keep meaning, facts and length roughly the same.',
};

let client = null;
export function writingAvailable() { return Boolean((process.env.ANTHROPIC_API_KEY || '').trim()); }

export async function runWriting(body) {
  if (!writingAvailable()) return { status: 'unavailable' };
  client ||= new Anthropic();
  const { action = 'generate', question = '', wordLimit, tone = 'confident', instructions = '', facts = '', opportunity = '', current = '' } = body || {};
  if (!TASKS[action]) return { status: 'error' };

  const user = [
    `TASK: ${TASKS[action]}`,
    `QUESTION: ${String(question).slice(0, 2000)}`,
    wordLimit ? `WORD LIMIT: ${Number(wordLimit)} words maximum` : 'WORD LIMIT: none given (aim for about 450 words)',
    `TONE: ${String(tone).slice(0, 40)}`,
    instructions ? `EXTRA INSTRUCTIONS FROM THE STUDENT: ${String(instructions).slice(0, 1500)}` : '',
    `STUDENT FACTS:\n${String(facts).slice(0, 12000)}`,
    `OPPORTUNITY:\n${String(opportunity).slice(0, 6000) || 'Not specified'}`,
    current ? `CURRENT DRAFT:\n${String(current).slice(0, 12000)}` : '',
  ].filter(Boolean).join('\n\n');

  const response = await client.beta.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });
  if (response.stop_reason === 'refusal') return { status: 'error' };
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return text ? { status: 'ok', text } : { status: 'error' };
}
