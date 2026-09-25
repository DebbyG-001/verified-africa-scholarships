import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Lightbulb, AlertTriangle, LifeBuoy, BookOpen, ArrowRight } from 'lucide-react';
import { GUIDES } from '../lib/courses.js';
import { SmartImg, Empty } from '../components/ui.jsx';

export default function GuidePage() {
  const { slug } = useParams();
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return <div className="page"><div className="container"><Empty icon={BookOpen} title="Guide not found" body="It may have moved. Browse all course guides instead."><Link to="/learn" className="btn primary">Course Intelligence</Link></Empty></div></div>;
  const others = GUIDES.filter((x) => x.slug !== slug && x.area.split(' / ')[0] === g.area.split(' / ')[0]).slice(0, 3);
  return (
    <div className="page">
      <div className="container narrow">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/learn">Course Intelligence</Link><ChevronRight size={14} /><span aria-current="page">{g.title}</span></nav>
        <SmartImg className="guide-hero" src={g.img.src} alt={g.img.alt} eager />
        <div className="row wrap" style={{ gap: 6, marginTop: 20 }}><span className="badge forest">Horizon guide</span><span className="badge">{g.area}</span><span className="badge">{g.level}</span></div>
        <h1 className="serif guide-title">{g.title}</h1>
        <p className="lead-sm">{g.summary}</p>
        <div className="notice" style={{ marginTop: 16 }}><BookOpen size={18} /><span>General guidance, not official course information. Your department’s syllabus, lecturers and rules may differ — always check with them.</span></div>
        {[[Lightbulb, 'Course tips', g.tips, 'tips'], [AlertTriangle, 'Common mistakes', g.mistakes, 'mistakes'], [LifeBuoy, 'Survival guide', g.survival, 'survival']].map(([Icon, title, items, k]) => (
          <section key={k} className={`guide-sec ${k}`}>
            <h2 className="serif"><Icon size={20} />{title}</h2>
            <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        ))}
        <section className="guide-sec">
          <h2 className="serif">Study strategies to pair with this</h2>
          <p className="small">Practise testing yourself, spread your study over several days and mix problem types. <Link to="/learn" className="link">See the research-backed strategies</Link>.</p>
        </section>
        {others.length > 0 && (
          <section className="band">
            <h2 className="side-title" style={{ marginBottom: 12 }}>Related guides</h2>
            <div className="stack">{others.map((o) => <Link key={o.slug} to={`/learn/${o.slug}`} className="essay-link"><BookOpen size={16} /><span className="grow">{o.title}</span><span className="tiny muted">{o.level}</span><ArrowRight size={15} /></Link>)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
