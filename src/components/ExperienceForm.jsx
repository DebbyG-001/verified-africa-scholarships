import { useState } from 'react';
import { EXPERIENCE_TYPES } from '../lib/constants.js';
import { Field, Checkbox } from './ui.jsx';

const PLACEHOLDER = {
  project: ['e.g. Campus lost-and-found web app', 'What you built, the tools you used, and what happened (users, results, what you learned).'],
  competition: ['e.g. University hackathon 2025', 'What you made, your role in the team, and the outcome.'],
  award: ['e.g. Departmental best student award', 'What it was for and who awarded it.'],
  certification: ['e.g. Introduction to Machine Learning', 'What the course covered and what you built or learned.'],
  publication: ['e.g. Article on campus tech communities', 'Where it was published and what it was about.'],
  work: ['e.g. Part-time sales assistant', 'Your responsibilities and anything you improved.'],
  internship: ['e.g. Software engineering intern', 'What you worked on and what you achieved.'],
  leadership: ['e.g. Class representative', 'What you were responsible for and what changed because of you.'],
  volunteering: ['e.g. Coding tutor, community outreach', 'Who you helped, how, and for how long.'],
  research: ['e.g. Research assistant, NLP for Yoruba', 'The question, your contribution and any results.'],
};

export function validateExperience(e) {
  const errors = {};
  if (!e.title || e.title.trim().length < 2) errors.title = 'Add a short title so you can recognise this later.';
  if (e.start && e.end && !e.current && e.end < e.start) errors.end = 'The end date is before the start date.';
  if (e.link && !/^https?:\/\/\S+\.\S+/.test(e.link.trim())) errors.link = 'Enter a full web address starting with http:// or https://';
  if (e.description && e.description.length > 1200) errors.description = 'Keep this under 1,200 characters.';
  return errors;
}

export default function ExperienceForm({ value, onChange, errors = {}, types, idPrefix = 'exp' }) {
  const e = value;
  const set = (k, v) => onChange({ ...e, [k]: v });
  const opts = types ? EXPERIENCE_TYPES.filter((t) => types.includes(t.value)) : EXPERIENCE_TYPES;
  const [ph, dph] = PLACEHOLDER[e.type] || PLACEHOLDER.project;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Field label="Type" id={`${idPrefix}-type`}>
        <select id={`${idPrefix}-type`} className="select" value={e.type} onChange={(ev) => set('type', ev.target.value)}>
          {opts.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="Title" id={`${idPrefix}-title`} error={errors.title}>
        <input id={`${idPrefix}-title`} className="input" value={e.title} onChange={(ev) => set('title', ev.target.value)} placeholder={ph} aria-invalid={!!errors.title} maxLength={120} data-autofocus />
      </Field>
      <Field label="Organisation or place" id={`${idPrefix}-org`} optional>
        <input id={`${idPrefix}-org`} className="input" value={e.org || ''} onChange={(ev) => set('org', ev.target.value)} placeholder="e.g. Google Developer Student Club, your university" maxLength={120} />
      </Field>
      <div className="grid-2">
        <Field label="Started" id={`${idPrefix}-start`} optional>
          <input id={`${idPrefix}-start`} type="month" className="input" value={e.start || ''} onChange={(ev) => set('start', ev.target.value)} />
        </Field>
        <Field label="Ended" id={`${idPrefix}-end`} error={errors.end} optional>
          <input id={`${idPrefix}-end`} type="month" className="input" value={e.end || ''} disabled={e.current} onChange={(ev) => set('end', ev.target.value)} aria-invalid={!!errors.end} />
        </Field>
      </div>
      <Checkbox checked={e.current} onChange={(v) => onChange({ ...e, current: v, end: v ? '' : e.end })}><span>I’m still doing this</span></Checkbox>
      <Field label="What did you do?" id={`${idPrefix}-desc`} hint="Horizon uses your exact words in drafts and your CV, so be specific. Numbers and outcomes help." error={errors.description} optional>
        <textarea id={`${idPrefix}-desc`} className="textarea" value={e.description || ''} onChange={(ev) => set('description', ev.target.value)} placeholder={dph} aria-invalid={!!errors.description} />
      </Field>
      <Field label="Link" id={`${idPrefix}-link`} hint="A demo, repository, certificate or article." error={errors.link} optional>
        <input id={`${idPrefix}-link`} className="input" type="url" inputMode="url" value={e.link || ''} onChange={(ev) => set('link', ev.target.value)} placeholder="https://" aria-invalid={!!errors.link} />
      </Field>
    </div>
  );
}

export const blankExperience = (type = 'project') => ({ type, title: '', org: '', start: '', end: '', current: false, description: '', link: '' });
