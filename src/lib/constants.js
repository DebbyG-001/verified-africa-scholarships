export const ACADEMIC_STAGES = [
  { value: 'secondary', label: 'Secondary school (final years)' },
  { value: '100', label: '100 Level / Year 1' },
  { value: '200', label: '200 Level / Year 2' },
  { value: '300', label: '300 Level / Year 3' },
  { value: '400', label: '400 Level / Year 4' },
  { value: '500', label: '500 Level / Year 5' },
  { value: '600', label: '600 Level / Year 6' },
  { value: 'graduate', label: 'Recent graduate' },
  { value: 'masters', label: "Master's student" },
  { value: 'phd', label: 'PhD student' },
];

export const PROGRAMME_LENGTHS = [3, 4, 5, 6];

export const GOAL_TYPES = [
  { value: 'study-abroad', label: 'Study abroad', hint: "A master's or degree programme in another country" },
  { value: 'scholarship', label: 'Win scholarships', hint: 'Funding for your current or next degree' },
  { value: 'internship', label: 'Land an internship', hint: 'Industry experience while you study' },
  { value: 'job', label: 'Get a graduate job', hint: 'A strong first role after university' },
  { value: 'research', label: 'Go into research', hint: 'Research roles, a PhD or academic path' },
  { value: 'leadership', label: 'Leadership & fellowships', hint: 'Fellowships, leadership programmes, impact work' },
];

export const TARGET_LEVELS = ["Master's", 'PhD', 'Undergraduate exchange', 'Short course / summer school', 'Not a degree'];

export const DESTINATIONS = [
  'United Kingdom', 'United States', 'Canada', 'Germany', 'Netherlands', 'Ireland', 'France', 'Sweden', 'Finland',
  'Norway', 'Denmark', 'Switzerland', 'Italy', 'Spain', 'Belgium', 'Hungary', 'Australia', 'New Zealand', 'Japan',
  'South Korea', 'China', 'Singapore', 'United Arab Emirates', 'South Africa', 'Rwanda', 'Ghana', 'Kenya', 'Nigeria',
];

export const HOME_COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Ethiopia', 'Uganda', 'Tanzania', 'Rwanda', 'Cameroon', 'Senegal',
  'Zambia', 'Zimbabwe', 'Malawi', 'Botswana', 'Namibia', 'Morocco', 'Tunisia', 'Sierra Leone', 'Liberia', 'Gambia',
  'Benin', 'Togo', "Côte d'Ivoire", 'Other country',
];
export const AFRICAN = new Set(HOME_COUNTRIES.filter((c) => c !== 'Other country').concat(['Algeria', 'Sudan', 'Mali', 'Niger', 'Mozambique', 'Angola', 'Mauritius']));

export const EXPERIENCE_TYPES = [
  { value: 'project', label: 'Project', group: 'done' },
  { value: 'competition', label: 'Competition / hackathon', group: 'done' },
  { value: 'award', label: 'Award or recognition', group: 'done' },
  { value: 'certification', label: 'Course or certification', group: 'done' },
  { value: 'publication', label: 'Publication or article', group: 'done' },
  { value: 'work', label: 'Work / part-time job', group: 'experience' },
  { value: 'internship', label: 'Internship', group: 'experience' },
  { value: 'leadership', label: 'Leadership role', group: 'experience' },
  { value: 'volunteering', label: 'Volunteering / community', group: 'experience' },
  { value: 'research', label: 'Research', group: 'experience' },
];
export const expLabel = (t) => EXPERIENCE_TYPES.find((x) => x.value === t)?.label || 'Experience';

export const SKILL_SUGGESTIONS = {
  tech: ['Python', 'JavaScript', 'Java', 'C++', 'SQL', 'Git', 'Data analysis', 'Machine learning', 'Linux', 'React', 'Statistics', 'Linear algebra'],
  general: ['Public speaking', 'Technical writing', 'Teamwork', 'Project management', 'Research', 'Excel', 'Leadership', 'Problem solving', 'French', 'Design'],
};

export const DOC_CATEGORIES = [
  { value: 'academic', label: 'Academic', subs: ['Transcript', 'Academic record', 'Results'] },
  { value: 'identity', label: 'Identity', subs: ['Passport', 'National ID', 'Birth certificate', 'Other ID'] },
  { value: 'career', label: 'Career', subs: ['CV', 'Resume', 'Portfolio'] },
  { value: 'certificates', label: 'Certificates', subs: ['Course', 'Training', 'Competition'] },
  { value: 'recommendations', label: 'Recommendations', subs: ['Recommendation letter'] },
  { value: 'applications', label: 'Applications', subs: ['Personal statement', 'Essay', 'Statement of purpose'] },
  { value: 'achievements', label: 'Achievements', subs: ['Award', 'Recognition'] },
  { value: 'other', label: 'Other', subs: ['Other'] },
];
export const catLabel = (v) => DOC_CATEGORIES.find((c) => c.value === v)?.label || 'Other';

// What a student can say they already have during onboarding (declared, not uploaded).
export const DECLARABLE_DOCS = [
  { key: 'cv', label: 'CV or resume', category: 'career', sub: 'CV' },
  { key: 'transcript', label: 'Transcript or results', category: 'academic', sub: 'Transcript' },
  { key: 'passport', label: 'Passport or national ID', category: 'identity', sub: 'Passport' },
  { key: 'certificates', label: 'Certificates', category: 'certificates', sub: 'Course' },
  { key: 'recommendation', label: 'Recommendation letter', category: 'recommendations', sub: 'Recommendation letter' },
  { key: 'statement', label: 'Personal statement', category: 'applications', sub: 'Personal statement' },
  { key: 'language', label: 'English test result (IELTS/TOEFL)', category: 'academic', sub: 'Results' },
];

export const DOC_STATUSES = ['Ready', 'Needs update', 'Draft'];

export const APP_STATUSES = [
  { value: 'interested', label: 'Interested' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'ready', label: 'Ready to Apply' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
];
export const statusLabel = (v) => APP_STATUSES.find((s) => s.value === v)?.label || v;
export const ACTIVE_STATUSES = ['interested', 'preparing', 'drafting', 'ready'];

export const ACCEPTED_FILES = {
  'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'text/plain': 'TXT',
  'application/msword': 'DOC', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};
export const ACCEPTED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'doc', 'docx'];
// Kept at 4 MB so uploads fit within hosting request limits (e.g. Vercel allows about 4.5 MB).
export const MAX_FILE_MB = 4;
