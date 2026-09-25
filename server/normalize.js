// Turns raw records from the Africa Scholarship and Essay Crawler into Horizon's opportunity shape.
// Only information present in the record is used. Derived fields (type, level, field, location,
// funding) are keyword readings of the record's own text and are left empty when nothing matches.
import crypto from 'node:crypto';

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Ethiopia', 'Uganda', 'Tanzania', 'Rwanda', 'Cameroon',
  'Senegal', 'Zambia', 'Zimbabwe', 'Malawi', 'Botswana', 'Namibia', 'Morocco', 'Tunisia', 'Algeria', 'Sierra Leone',
  'Liberia', 'Gambia', 'Benin', 'Togo', "Côte d'Ivoire", 'Ivory Coast', 'Mali', 'Niger', 'Burkina Faso', 'Sudan',
  'Somalia', 'Mozambique', 'Angola', 'Lesotho', 'Eswatini', 'Mauritius', 'Madagascar', 'Congo', 'Gabon', 'Chad',
  'United Kingdom', 'UK', 'United States', 'USA', 'Canada', 'Germany', 'France', 'Netherlands', 'Sweden', 'Norway',
  'Finland', 'Denmark', 'Ireland', 'Italy', 'Spain', 'Switzerland', 'Belgium', 'Austria', 'Hungary', 'Poland',
  'Australia', 'New Zealand', 'Japan', 'China', 'South Korea', 'Korea', 'Taiwan', 'Singapore', 'India', 'Turkey',
  'Saudi Arabia', 'Qatar', 'United Arab Emirates', 'UAE', 'Israel', 'Brazil', 'Mexico', 'Russia', 'Czech Republic',
];
const ALIAS = { UK: 'United Kingdom', USA: 'United States', UAE: 'United Arab Emirates', Korea: 'South Korea', 'Ivory Coast': "Côte d'Ivoire" };

const TYPES = [
  ['Essay competition', /\b(essay|writing (competition|contest|prize)|poetry|short story)\b/i],
  ['Internship', /\binternships?\b/i],
  ['Fellowship', /\bfellowships?\b/i],
  ['Grant', /\b(grants?|funding call|research fund)\b/i],
  ['Conference', /\b(conference|summit|forum|symposium)\b/i],
  ['Competition', /\b(competition|challenge|hackathon|olympiad|contest|prize)\b/i],
  ['Scholarship', /\b(scholarships?|bursar(y|ies)|tuition (award|waiver)|studentship)\b/i],
  ['Programme', /\b(programme|program|bootcamp|academy|training|leadership|mentorship)\b/i],
];

const LEVELS = [
  ['Secondary school', /\b(secondary school|high school|ssce|waec|neco|senior secondary|ss3)\b/i],
  ['Undergraduate', /\b(undergraduates?|undergrad|(?:currently|students?) (?:enrolled|studying) (?:in|for) an? (?:bachelor'?s|first) degree|100\s?level|200\s?level|300\s?level|400\s?level|final.year students?)\b/i],
  ['Masters', /\b(master'?s?|msc|m\.sc|mba|m\.?eng|postgraduate|graduate studies|llm)\b/i],
  ['PhD', /\b(ph\.?d|doctoral|doctorate)\b/i],
];

const FIELDS = [
  ['Computer science & tech', /\b(computer|computing|software|information technology|\bict\b|data science|artificial intelligence|\bai\b|machine learning|cyber|coding|programming|digital|tech)\b/i],
  ['Engineering', /\bengineering\b/i],
  ['STEM', /\b(stem|science|mathematics|physics|chemistry|biology)\b/i],
  ['Health & medicine', /\b(medicine|medical|health|nursing|pharmacy|public health)\b/i],
  ['Business & economics', /\b(business|economics|finance|accounting|management|entrepreneur\w*|mba)\b/i],
  ['Law & policy', /\b(law|legal|policy|governance|international relations)\b/i],
  ['Agriculture & environment', /\b(agricultur\w*|environment\w*|climate|sustainab\w*|energy)\b/i],
  ['Arts & humanities', /\b(arts?|humanities|literature|journalism|media|creative|history|philosophy)\b/i],
  ['Education', /\b(education|teaching|teacher)\b/i],
];

const MONTHS = 'january february march april may june july august september october november december'.split(' ');

export function parseDeadline(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1').replace(/deadline:?/i, '').replace(/\s+/g, ' ').trim();
  // ISO
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  // day-first numeric (common on Nigerian listings): 31/12/2026
  m = s.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  // "31 December 2026" or "December 31, 2026"
  const mon = MONTHS.map((x) => x.slice(0, 3)).join('|');
  m = s.match(new RegExp(`\\b(\\d{1,2})\\s+(${mon})[a-z]*\\.?,?\\s+(\\d{4})`, 'i'));
  if (m) return valid(+m[3], monthIndex(m[2]), +m[1]);
  m = s.match(new RegExp(`\\b(${mon})[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i'));
  if (m) return valid(+m[3], monthIndex(m[1]), +m[2]);
  return null;
}
function monthIndex(name) { return MONTHS.findIndex((x) => x.startsWith(name.toLowerCase().slice(0, 3))) + 1; }
function valid(y, mo, d) {
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 ? dt.toISOString().slice(0, 10) : null;
}

const asList = (v) => {
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : x?.text || x?.name || '')).map(clean).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(/\n|•|;/).map(clean).filter(Boolean);
  return [];
};
const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^(?:[-–•*]+\s*|\d{1,2}[.)]\s+)/, '').trim();
const str = (v) => (typeof v === 'string' ? clean(v) : '');

function domainOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function safeUrl(u) {
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.toString() : ''; } catch { return ''; }
}

// Some source sites put several labelled fields into one line, e.g.
// "Mastercard FoundationHost Country: Africa || KenyaCategory: Internships Benefits: • Stipend Eligibility: … Deadline: …".
// Split those back into their real fields. Nothing is added that isn't in the text.
const LABELS = ['Host Country', 'Category', 'Benefits', 'Eligibility', 'Deadline'];
function splitProvider(raw) {
  const out = { name: '', hosts: [], categories: [], benefits: [], eligibility: '', deadline: '' };
  if (!raw) return out;
  const re = new RegExp(`(${LABELS.join('|')}):`, 'g');
  const parts = raw.split(re);
  out.name = clean(parts[0]);
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i]; const value = clean(parts[i + 1] || '');
    if (label === 'Host Country') out.hosts = value.split('||').map(clean).filter(Boolean);
    if (label === 'Category') out.categories = value.split('||').map(clean).filter(Boolean);
    if (label === 'Benefits') out.benefits = value.split('•').map((x) => clean(x.replace(/^[€$£₦]\s*(?=[A-Za-z])/, ''))).filter((x) => x.length > 1);
    if (label === 'Eligibility') out.eligibility = value;
    if (label === 'Deadline') out.deadline = value;
  }
  if (/^(unknown( provider)?|n\/a|not specified|none)$/i.test(out.name)) out.name = '';
  return out;
}

export function normalize(item) {
  const title = str(item.title) || str(item.name);
  if (!title) return null;
  const meta = splitProvider(str(item.provider) || str(item.organisation) || str(item.organization) || '');
  const provider = meta.name;
  const eligibility = asList(item.eligibility);
  if (meta.eligibility && !eligibility.some((e) => e.toLowerCase() === meta.eligibility.toLowerCase())) eligibility.unshift(meta.eligibility);
  const requiredDocuments = asList(item.requiredDocuments || item.required_documents || item.documents);
  const applyLink = safeUrl(item.applyLink || item.apply_link || item.applicationUrl || '');
  const sourceUrl = safeUrl(item.sourceUrl || item.url || item.source || '');
  const description = str(item.description || item.summary || item.overview || '');
  let deadlineRaw = str(typeof item.deadline === 'string' ? item.deadline : '');
  if ((!deadlineRaw || !parseDeadline(deadlineRaw)) && parseDeadline(meta.deadline)) deadlineRaw = meta.deadline;
  const deadline = parseDeadline(deadlineRaw);
  const benefitsRaw = asList(item.benefits || item.funding || item.value);
  for (const b of meta.benefits) if (!benefitsRaw.includes(b)) benefitsRaw.push(b);

  const text = [title, provider, description, ...eligibility, ...benefitsRaw, meta.hosts.join(', '), meta.categories.join(', ')].join(' \n ');

  // The listing title decides first; the source's own category is used when the title is vague ("Programme").
  const titleType = TYPES.find(([, re]) => re.test(title))?.[0];
  const catType = meta.categories.map((c) => TYPES.find(([t, re]) => !['Programme', 'Scholarship'].includes(t) && re.test(c))?.[0]).find(Boolean);
  const type = (titleType && titleType !== 'Programme' ? titleType : catType || titleType)
    || TYPES.find(([, re]) => re.test(text))?.[0] || 'Opportunity';
  const levels = LEVELS.filter(([, re]) => re.test(text)).map(([l]) => l);
  const fields = FIELDS.filter(([, re]) => re.test(text)).map(([f]) => f);
  const locations = [...new Set(COUNTRIES.filter((c) => new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, c.length <= 3 ? '' : 'i').test(text)).map((c) => ALIAS[c] || c))];
  const africaWide = /\b(africa|african)\b/i.test(text);

  let funding = '';
  if (/\bfull(y)?[-\s]?funded\b|\bfull scholarship\b|\bfull tuition\b/i.test(text)) funding = 'Fully funded';
  else if (/\bpartial(ly)?[-\s]?(funded|scholarship|tuition)\b/i.test(text)) funding = 'Partially funded';
  const amount = text.match(/(?:[$£€₦]\s?|\b(?:USD|NGN|GBP|EUR)\s?)\d[\d,]*(?:\.\d+)?(?:\s?(?:million|thousand|bn|k|m)\b)?/i)
    || text.match(/\bN\d{1,3}(?:,\d{3})+\b|\bN\d+(?:\.\d+)?\s?(?:million|m)\b/); // naira written with a plain "N"
  const fundingAmount = amount ? amount[0].trim() : '';

  const id = crypto.createHash('sha1').update((sourceUrl || '') + '|' + title.toLowerCase()).digest('hex').slice(0, 12);

  return {
    id,
    title,
    provider,
    description,
    deadline, // ISO date or null
    deadlineText: deadlineRaw,
    eligibility,
    requiredDocuments,
    benefits: benefitsRaw,
    applyLink,
    applyDomain: domainOf(applyLink),
    sourceUrl,
    sourceDomain: domainOf(sourceUrl),
    isTrusted: item.isTrusted === true,
    type,
    levels,
    fields,
    locations,
    africaWide,
    funding,
    fundingAmount,
  };
}

// Listing/navigation pages the crawler sometimes picks up (e.g. "Browse Trainings",
// "Search Results for: NNPC") are not opportunities, so they are left out.
function isNavigationPage(o) {
  const empty = !o.eligibility.length && !o.requiredDocuments.length && !o.deadline;
  return empty && (/^(browse|search results|category|archives?|page \d|all )/i.test(o.title) || o.title.split(/\s+/).length <= 3);
}

export function normalizeAll(items) {
  const seen = new Map();
  for (const raw of Array.isArray(items) ? items : []) {
    const o = normalize(raw || {});
    if (!o || isNavigationPage(o)) continue;
    const key = o.title.toLowerCase() + '|' + (o.applyLink || o.sourceUrl);
    if (!seen.has(key)) seen.set(key, o);
  }
  return [...seen.values()];
}
