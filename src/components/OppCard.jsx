import { Link } from 'react-router-dom';
import { Heart, MapPin, Clock, Wallet, ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { imageForOpportunity } from '../lib/images.js';
import { deadlineInfo, matchOpportunity } from '../lib/insights.js';
import { SmartImg, useToast } from './ui.jsx';

export function SaveButton({ opp, className = 'save-btn', withLabel }) {
  const { state, toggleSave } = useStore();
  const toast = useToast();
  const saved = !!state.saved[opp.id];
  const onClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    toggleSave(opp);
    toast(saved ? 'Removed from saved opportunities.' : 'Saved. You’ll find it under Saved Opportunities.', { tone: saved ? 'info' : 'ok', action: saved ? { label: 'Undo', onClick: () => toggleSave(opp) } : undefined });
  };
  if (withLabel) {
    return <button className={`btn ${saved ? 'secondary on-saved' : 'secondary'}`} onClick={onClick} aria-pressed={saved}><Heart size={17} fill={saved ? 'var(--sun)' : 'none'} color={saved ? 'var(--sun)' : 'currentColor'} />{saved ? 'Saved' : 'Save Opportunity'}</button>;
  }
  return (
    <button className={`${className} ${saved ? 'on' : ''}`} onClick={onClick} aria-pressed={saved} aria-label={saved ? `Remove ${opp.title} from saved` : `Save ${opp.title}`}>
      <Heart size={18} />
    </button>
  );
}

export default function OppCard({ opp, compact, list }) {
  const { state } = useStore();
  const img = imageForOpportunity(opp);
  const d = deadlineInfo(opp);
  const m = matchOpportunity(opp, state);
  const location = opp.locations?.length ? opp.locations.slice(0, 2).join(', ') + (opp.locations.length > 2 ? ` +${opp.locations.length - 2}` : '') : opp.africaWide ? 'Africa' : null;
  const funding = opp.funding || (opp.fundingAmount ? opp.fundingAmount : null);
  return (
    <article className={`opp-card ${list ? 'list' : ''}`}>
      <SmartImg src={img.src} alt="" />
      <div className="over">
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="badge light">{opp.type}</span>
          {d.closed && <span className="badge dark">Closed</span>}
        </div>
        <SaveButton opp={opp} />
      </div>
      <div className="opp-body">
        <div>
          <h3 className="opp-title clamp-2"><Link to={`/opportunities/${opp.id}`}>{opp.title}</Link></h3>
          <div className="opp-org truncate">{opp.provider || opp.sourceDomain || 'Provider not stated'}</div>
        </div>
        <div className="opp-meta">
          {location && <span><MapPin size={14} />{location}</span>}
          {opp.levels?.length > 0 && <span><GraduationCap size={14} />{opp.levels.slice(0, 2).join(', ')}</span>}
          {funding && <span><Wallet size={14} />{funding}</span>}
          {opp.isTrusted && <span className="text-ok"><ShieldCheck size={14} />Verified source</span>}
        </div>
        {!compact && m.reasons[0] && <div className="match-line"><Sparkles size={15} /><span className="clamp-2">{m.reasons[0]}</span></div>}
        <div className="opp-foot">
          <span className={`deadline ${d.tone}`}><Clock size={14} />{d.label.length > 34 ? d.label.slice(0, 32) + '…' : d.label}</span>
          {m.label && <span className={`badge ${m.label === 'Strong match' ? 'forest' : ''}`}>{m.label}</span>}
        </div>
      </div>
    </article>
  );
}

export function OppCardSkeleton() {
  return (
    <div className="opp-card" aria-hidden="true">
      <div className="skel" style={{ aspectRatio: '16/9', borderRadius: 0 }} />
      <div className="opp-body">
        <div className="skel" style={{ height: 22, width: '85%' }} />
        <div className="skel" style={{ height: 14, width: '50%' }} />
        <div className="skel" style={{ height: 14, width: '70%' }} />
        <div className="skel" style={{ height: 36, width: '100%', marginTop: 8 }} />
      </div>
    </div>
  );
}
