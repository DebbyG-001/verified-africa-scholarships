import { Link } from 'react-router-dom';
import { PenLine, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { wordCount, placeholders } from '../lib/draft.js';
import { timeAgo } from '../lib/insights.js';
import { IMG } from '../lib/images.js';
import { Empty } from '../components/ui.jsx';

export default function Essays() {
  const { state } = useStore();
  const essays = [...state.essays].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div className="page"><div className="container">
      <div className="page-head">
        <div><span className="eyebrow">Writing</span><h1>Essays & statements</h1><p>Drafts built from your own experiences. Edit them freely — they’re yours.</p></div>
        <Link to="/essays/new" className="btn primary"><Sparkles size={16} />New draft</Link>
      </div>
      {essays.length === 0 ? (
        <Empty img={IMG.writing} title="No drafts yet" body="Paste an application question and Horizon drafts a personal statement using only your real profile. Anything missing, it asks you.">
          <Link to="/essays/new" className="btn primary"><PenLine size={16} />Start a draft</Link>
        </Empty>
      ) : (
        <ul className="essay-grid stagger">
          {essays.map((e) => {
            const app = state.applications.find((a) => a.id === e.appId);
            const holes = placeholders(e.content).length;
            return (
              <li key={e.id}><Link to={`/essays/${e.id}`} className="essay-card">
                <span className="badge">Draft</span>
                <h2 className="serif clamp-2">{e.title}</h2>
                {app && <span className="tiny muted truncate">For {app.opp.title}</span>}
                <p className="small muted clamp-3">{e.content || e.question || 'Empty draft'}</p>
                <div className="row between tiny muted" style={{ marginTop: 'auto' }}>
                  <span>{wordCount(e.content)} words{holes ? ` · ${holes} to fill in` : ''}</span><span>{timeAgo(e.updatedAt)} <ArrowRight size={13} /></span>
                </div>
              </Link></li>
            );
          })}
        </ul>
      )}
    </div></div>
  );
}
