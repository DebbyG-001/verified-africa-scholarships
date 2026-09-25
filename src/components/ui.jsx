import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone: opts.tone || 'ok', action: opts.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.tone}`}>
              {t.tone === 'bad' ? <AlertCircle size={18} /> : t.tone === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
              <span className="grow">{t.msg}</span>
              {t.action && <button className="link toast-action" onClick={() => { t.action.onClick(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>}
              <button className="toast-x" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><X size={16} /></button>
            </div>
          ))}
        </div>, document.body)}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Modal / Drawer ---------- */
function useLockBody(open) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
}
function useFocusTrap(open, ref, onClose) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const el = ref.current;
    const sel = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
    setTimeout(() => { (el?.querySelector('[data-autofocus]') || el?.querySelector(sel))?.focus(); }, 30);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll(sel)].filter((x) => x.offsetParent !== null);
        if (!items.length) return;
        const first = items[0]; const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open]); // eslint-disable-line
}

export function Modal({ open, onClose, title, children, footer, size = 'md', kind = 'modal', label }) {
  const ref = useRef(null);
  const titleId = useId();
  useLockBody(open);
  useFocusTrap(open, ref, onClose);
  if (!open) return null;
  return createPortal(
    <div className={`overlay ${kind}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} className={`${kind === 'drawer' ? 'drawer' : 'modal'} ${size}`} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : label}>
        {title && (
          <div className="modal-head">
            <h2 id={titleId} className="serif">{title}</h2>
            <button className="btn icon ghost sm" onClick={onClose} aria-label="Close"><X size={20} /></button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>, document.body);
}
export const Drawer = (p) => <Modal {...p} kind="drawer" />;

/* ---------- Confirm ---------- */
const ConfirmCtx = createContext(() => Promise.resolve(false));
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title} size="sm"
        footer={<>
          <button className="btn secondary" onClick={() => close(false)}>{state?.cancelLabel || 'Cancel'}</button>
          <button className={`btn ${state?.danger ? 'danger' : 'primary'}`} onClick={() => close(true)} data-autofocus>{state?.confirmLabel || 'Confirm'}</button>
        </>}>
        <p className="muted">{state?.body}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

/* ---------- Small pieces ---------- */
export function Ring({ value = 0, size = 88, stroke = 8, label, sub, color = 'var(--forest)', track = 'var(--paper-2)', textColor }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(value), 60); return () => clearTimeout(t); }, [value]);
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label ?? value + '%'}${sub ? ' ' + sub : ''}`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(v, 100)) / 100} />
      </svg>
      <div className="ring-label" style={{ color: textColor }}>
        <div style={{ fontWeight: 700, fontSize: size > 80 ? 22 : 15 }}>{label ?? `${value}%`}</div>
        {sub && <div className="tiny" style={{ opacity: .75 }}>{sub}</div>}
      </div>
    </div>
  );
}

export function Bar({ value, className = '', label }) {
  return <div className={`bar ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Checkbox({ checked, onChange, label, children, id }) {
  const auto = useId();
  return (
    <label className="check" htmlFor={id || auto}>
      <input id={id || auto} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="checkbox" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
      {children}
    </label>
  );
}

export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={!!checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export const Spinner = ({ size = 18 }) => <Loader2 size={size} className="spin" aria-hidden="true" />;

export function Empty({ icon: Icon, title, body, children, img }) {
  if (img) {
    return (
      <div className="empty with-img">
        <img src={img.src} alt={img.alt} loading="lazy" />
        <div>
          <h3>{title}</h3>
          <p>{body}</p>
          {children && <div className="row wrap" style={{ marginTop: 6 }}>{children}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="empty">
      {Icon && <div className="icon-wrap"><Icon size={26} /></div>}
      <h3>{title}</h3>
      <p>{body}</p>
      {children && <div className="row wrap" style={{ justifyContent: 'center', marginTop: 4 }}>{children}</div>}
    </div>
  );
}

export function Field({ label, hint, error, children, id, optional }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}{optional && <span className="muted" style={{ fontWeight: 400 }}> (optional)</span>}</label>}
      {children}
      {error ? <div className="error" id={id ? `${id}-err` : undefined}><AlertCircle size={15} />{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

export function LoadingBlock({ text = 'Loading…' }) {
  return <div className="loading-block" role="status"><Spinner size={22} /><span>{text}</span></div>;
}

export function SmartImg({ src, alt, className, style, eager }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className={`img-wrap ${loaded ? 'loaded' : ''} ${className || ''}`} style={style}>
      {!failed && <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
    </div>
  );
}
