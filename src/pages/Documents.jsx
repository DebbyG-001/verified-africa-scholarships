import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UploadCloud, FileText, FileImage, File as FileIcon, Search, X, RotateCcw, Trash2, Download, Pencil, Check, AlertCircle, Eye, Replace, FolderOpen, Filter, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore, uid } from '../lib/store.jsx';
import { DOC_CATEGORIES, catLabel, ACCEPTED_EXT, MAX_FILE_MB, DOC_STATUSES } from '../lib/constants.js';
import { guessCategory, fmtDate, timeAgo, docStatus } from '../lib/insights.js';
import { putFile, getFile, readWithProgress, downloadBlob } from '../lib/files.js';
import { IMG } from '../lib/images.js';
import { Modal, Drawer, Field, Empty, useToast, useConfirm, Spinner } from '../components/ui.jsx';

const extOf = (n) => (n.split('.').pop() || '').toLowerCase();
const human = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const kindIcon = (ext) => (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? FileImage : ['pdf', 'doc', 'docx', 'txt'].includes(ext) ? FileText : FileIcon);

export default function Documents() {
  const { state, addDocument, updateDocument, removeDocument, log } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [queue, setQueue] = useState([]); // in-progress / failed uploads
  const [drag, setDrag] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(params.get('category') || 'all');
  const [statusF, setStatusF] = useState('');
  const [sort, setSort] = useState('recent');
  const [previewId, setPreviewId] = useState(params.get('open'));
  const [dup, setDup] = useState(null); // {file, existing, resolve}
  const inputRef = useRef(null);
  const replaceRef = useRef(null);
  const filesRef = useRef({}); // queue id -> File (for retry)
  const uploadCat = params.get('category');

  useEffect(() => {
    if (params.get('upload') === '1') {
      setTimeout(() => document.getElementById('dropzone')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      setTimeout(() => inputRef.current?.click(), 400);
      const n = new URLSearchParams(params); n.delete('upload'); setParams(n, { replace: true });
    }
    if (params.get('open')) setPreviewId(params.get('open'));
  }, []); // eslint-disable-line

  const askDuplicate = (file, existing) => new Promise((resolve) => setDup({ file, existing, resolve }));

  const processOne = useCallback(async (file, qid, opts = {}) => {
    const ext = extOf(file.name);
    const setQ2 = (patch) => setQueue((qq) => qq.map((x) => (x.qid === qid ? { ...x, ...patch } : x)));
    if (!ACCEPTED_EXT.includes(ext)) { setQ2({ state: 'failed', error: `“.${ext || 'unknown'}” files aren’t supported. Use PDF, Word, JPG, PNG, WEBP or TXT.`, retryable: false }); return; }
    if (file.size > MAX_FILE_MB * 1048576) { setQ2({ state: 'failed', error: `This file is ${human(file.size)}. The limit is ${MAX_FILE_MB} MB — try compressing it.`, retryable: false }); return; }
    if (file.size === 0) { setQ2({ state: 'failed', error: 'This file is empty. Check the file and try again.', retryable: false }); return; }
    try {
      setQ2({ state: 'uploading', progress: 0 });
      const blob = await readWithProgress(file, (p) => setQ2({ progress: Math.round(p * 90) }));
      setQ2({ state: 'processing', progress: 95 });
      const id = opts.replaceId || uid('d');
      await putFile(id, blob);
      await new Promise((r) => setTimeout(r, 350)); // let the success state be seen
      const guess = guessCategory(file.name);
      const category = opts.category || (uploadCat && DOC_CATEGORIES.some((c) => c.value === uploadCat) ? uploadCat : guess.category);
      const sub = category === guess.category ? guess.sub : DOC_CATEGORIES.find((c) => c.value === category).subs[0];
      if (opts.replaceId) {
        updateDocument(opts.replaceId, { originalName: file.name, size: file.size, mime: file.type, ext, uploadedAt: Date.now() });
        log(`Replaced the file for ${state.documents.find((d) => d.id === opts.replaceId)?.name}`, `/documents?open=${opts.replaceId}`);
      } else {
        addDocument({ id, name: file.name.replace(/\.[^.]+$/, ''), originalName: file.name, size: file.size, mime: file.type, ext, category, sub, status: 'Ready', uploadedAt: Date.now(), updatedAt: Date.now() });
      }
      setQ2({ state: 'done', progress: 100, docId: id, category });
      setTimeout(() => setQueue((qq) => qq.filter((x) => x.qid !== qid)), 2600);
    } catch (e) {
      const quota = /quota/i.test(e?.name || e?.message || '');
      setQ2({ state: 'failed', error: quota ? 'Your device is out of storage space for Horizon. Free up space or remove older documents, then retry.' : 'This document couldn’t be uploaded. Check the file and try again.', retryable: true });
    }
  }, [addDocument, updateDocument, uploadCat, state.documents, log]);

  const handleFiles = async (fileList, opts = {}) => {
    const files = [...fileList];
    if (!files.length) return;
    for (const file of files) {
      if (!opts.replaceId) {
        const existing = state.documents.find((d) => d.originalName === file.name && d.size === file.size);
        if (existing) {
          const choice = await askDuplicate(file, existing);
          if (choice === 'skip') continue;
          if (choice === 'replace') { opts = { ...opts, replaceId: existing.id }; }
        }
      }
      const qid = uid('q');
      filesRef.current[qid] = file;
      setQueue((qq) => [...qq, { qid, name: file.name, size: file.size, ext: extOf(file.name), state: 'queued', progress: 0 }]);
      processOne(file, qid, opts);
      opts = { ...opts, replaceId: undefined };
    }
  };

  const retry = (item) => { const f = filesRef.current[item.qid]; if (f) processOne(f, item.qid); };

  const docs = useMemo(() => {
    const terms = q.toLowerCase().trim();
    let r = state.documents.filter((d) => (cat === 'all' || d.category === cat) && (!statusF || d.status === statusF) && (!terms || `${d.name} ${d.originalName} ${catLabel(d.category)} ${d.sub}`.toLowerCase().includes(terms)));
    if (sort === 'recent') r.sort((a, b) => b.uploadedAt - a.uploadedAt);
    if (sort === 'oldest') r.sort((a, b) => a.uploadedAt - b.uploadedAt);
    if (sort === 'name') r.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'size') r.sort((a, b) => b.size - a.size);
    return r;
  }, [state.documents, q, cat, statusF, sort]);

  const counts = useMemo(() => Object.fromEntries(DOC_CATEGORIES.map((c) => [c.value, state.documents.filter((d) => d.category === c.value).length])), [state.documents]);
  const recent = [...state.documents].sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 4);
  const essentials = [['cv', 'CV'], ['transcript', 'Transcript'], ['recommendation', 'Recommendation'], ['statement', 'Personal statement'], ['id', 'ID / passport']].map(([k, l]) => ({ k, l, s: docStatus(state, k).status }));
  const preview = state.documents.find((d) => d.id === previewId);

  const onDelete = async (d) => {
    if (await confirm({ title: `Delete “${d.name}”?`, body: 'This removes the document from your vault on this device. This can’t be undone.', confirmLabel: 'Delete document', danger: true })) {
      removeDocument(d.id); setPreviewId(null); toast('Document deleted.', { tone: 'info' });
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <div><span className="eyebrow">Document vault</span><h1>My Documents</h1><p>Upload your documents once. Horizon checks them against what each application asks for.</p></div>
          <button className="btn primary" onClick={() => inputRef.current?.click()}><UploadCloud size={18} />Upload Document</button>
        </div>

        {/* DROPZONE */}
        <div id="dropzone" className={`dropzone ${drag ? 'drag' : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }} onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); }}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}>
          <div className="dz-icon"><UploadCloud size={30} /></div>
          <h2 className="serif">{drag ? 'Release to upload' : 'Drop your documents here'}</h2>
          <p className="muted">or</p>
          <button className="btn primary" onClick={() => inputRef.current?.click()}>Choose files</button>
          <p className="tiny muted dz-types">PDF, Word (DOC, DOCX), JPG, PNG, WEBP or TXT · up to {MAX_FILE_MB} MB each · you can select several at once</p>
          {uploadCat && <p className="tiny"><span className="badge forest">New uploads go to {catLabel(uploadCat)}</span> <button className="link tiny" onClick={() => { const n = new URLSearchParams(params); n.delete('category'); setParams(n, { replace: true }); }}>Auto-sort instead</button></p>}
          <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_EXT.map((e) => '.' + e).join(',')} onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
          <input ref={replaceRef} type="file" hidden accept={ACCEPTED_EXT.map((e) => '.' + e).join(',')} onChange={(e) => { if (e.target.files[0] && preview) handleFiles([e.target.files[0]], { replaceId: preview.id }); e.target.value = ''; }} />
        </div>

        {queue.length > 0 && (
          <ul className="upload-queue" aria-live="polite">
            {queue.map((it) => {
              const Icon = kindIcon(it.ext);
              return (
                <li key={it.qid} className={`uq ${it.state}`}>
                  <span className="uq-icon"><Icon size={20} /></span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between"><strong className="truncate small">{it.name}</strong><span className="tiny muted nowrap">{human(it.size)} · {it.ext.toUpperCase()}</span></div>
                    {it.state === 'failed' ? <div className="tiny text-bad" role="alert">{it.error}</div> : (
                      <>
                        <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${it.progress}%` }} /></div>
                        <div className="tiny muted" style={{ marginTop: 4 }}>{it.state === 'queued' ? 'Waiting…' : it.state === 'uploading' ? `Uploading… ${it.progress}%` : it.state === 'processing' ? 'Reading your document…' : `Uploaded to ${catLabel(it.category)}`}</div>
                      </>
                    )}
                  </div>
                  {it.state === 'done' && <CheckCircle2 size={22} className="text-ok pop" />}
                  {['uploading', 'processing', 'queued'].includes(it.state) && <Loader2 size={20} className="spin muted" />}
                  {it.state === 'done' && <button className="btn ghost sm" onClick={() => setPreviewId(it.docId)}>View</button>}
                  {it.state === 'failed' && it.retryable && <button className="btn secondary sm" onClick={() => retry(it)}><RotateCcw size={14} />Retry</button>}
                  {it.state === 'failed' && <button className="btn icon ghost sm" aria-label="Dismiss" onClick={() => setQueue((qq) => qq.filter((x) => x.qid !== it.qid))}><X size={16} /></button>}
                </li>
              );
            })}
          </ul>
        )}

        {/* ESSENTIALS */}
        <div className="essentials">
          {essentials.map((e) => (
            <div key={e.k} className={`ess ${['uploaded', 'built'].includes(e.s) ? 'ok' : ''}`}>
              {['uploaded', 'built'].includes(e.s) ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{e.l}</span><small>{e.s === 'uploaded' ? 'Uploaded' : e.s === 'built' ? 'Built in Horizon' : e.s === 'draft' ? 'Draft only' : e.s === 'declared' ? 'Not uploaded' : 'Missing'}</small>
            </div>
          ))}
        </div>

        {state.documents.length === 0 ? (
          <Empty img={IMG.vault} title="Your document vault is empty" body="Upload your CV, certificates and academic documents once. Horizon will help you use them when preparing applications.">
            <button className="btn primary" onClick={() => inputRef.current?.click()}><UploadCloud size={16} />Upload Document</button>
          </Empty>
        ) : (
          <div className="vault-layout">
            <aside className="vault-cats" aria-label="Categories">
              <button className={`vc ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}><FolderOpen size={17} />All documents<small>{state.documents.length}</small></button>
              {DOC_CATEGORIES.map((c) => <button key={c.value} className={`vc ${cat === c.value ? 'on' : ''}`} onClick={() => setCat(c.value)}><span className={`vc-dot c-${c.value}`} />{c.label}<small>{counts[c.value]}</small></button>)}
            </aside>
            <section>
              {cat === 'all' && !q && !statusF && recent.length > 0 && (
                <div style={{ marginBottom: 26 }}>
                  <h2 className="side-title" style={{ marginBottom: 10 }}>Recent documents</h2>
                  <div className="recent-docs">
                    {recent.map((d) => { const Icon = kindIcon(d.ext); return <button key={d.id} className="recent-doc" onClick={() => setPreviewId(d.id)}><span className={`rd-thumb c-${d.category}`}><Icon size={22} /></span><strong className="truncate small">{d.name}</strong><span className="tiny muted">{timeAgo(d.uploadedAt)}</span></button>; })}
                  </div>
                </div>
              )}
              <div className="vault-tools">
                <div className="input-icon grow"><Search size={18} /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" /></div>
                <select className="select" style={{ width: 'auto' }} value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label="Filter by status"><option value="">Any status</option>{DOC_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort documents"><option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option><option value="size">Largest first</option></select>
                <select className="select show-md" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="all">All categories</option>{DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              </div>
              {docs.length === 0 ? (
                <Empty icon={Filter} title={q || statusF ? 'No documents match' : `No ${catLabel(cat).toLowerCase()} documents yet`} body={q || statusF ? 'Try a different search or clear the filters.' : 'Upload one here and Horizon will file it in this category.'}>
                  {(q || statusF) ? <button className="btn secondary" onClick={() => { setQ(''); setStatusF(''); }}>Clear filters</button> : <button className="btn primary" onClick={() => { const n = new URLSearchParams(params); n.set('category', cat); setParams(n, { replace: true }); setTimeout(() => inputRef.current?.click(), 50); }}><UploadCloud size={16} />Upload to {catLabel(cat)}</button>}
                </Empty>
              ) : (
                <ul className="doc-list stagger">
                  {docs.map((d) => {
                    const Icon = kindIcon(d.ext);
                    return (
                      <li key={d.id} className="doc-row">
                        <button className="doc-main" onClick={() => setPreviewId(d.id)} aria-label={`Preview ${d.name}`}>
                          <span className={`rd-thumb sm c-${d.category}`}><Icon size={18} /></span>
                          <span className="grow" style={{ minWidth: 0 }}>
                            <strong className="truncate" style={{ display: 'block' }}>{d.name}</strong>
                            <span className="tiny muted">{catLabel(d.category)} · {d.sub} · {d.ext.toUpperCase()} · {human(d.size)} · {fmtDate(d.uploadedAt)}</span>
                          </span>
                        </button>
                        <span className={`badge ${d.status === 'Ready' ? 'ok' : d.status === 'Draft' ? '' : 'warn'} hide-xs`}>{d.status}</span>
                        <button className="btn icon ghost sm" aria-label={`Preview ${d.name}`} onClick={() => setPreviewId(d.id)}><Eye size={17} /></button>
                        <button className="btn icon ghost sm hide-xs" aria-label={`Download ${d.name}`} onClick={async () => { const b = await getFile(d.id).catch(() => null); if (b) downloadBlob(b, d.originalName); else toast('This file couldn’t be opened. Try uploading it again.', { tone: 'bad' }); }}><Download size={17} /></button>
                        <button className="btn icon ghost sm" aria-label={`Delete ${d.name}`} onClick={() => onDelete(d)}><Trash2 size={17} /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      <PreviewDrawer doc={preview} onClose={() => { setPreviewId(null); if (params.get('open')) { const n = new URLSearchParams(params); n.delete('open'); setParams(n, { replace: true }); } }}
        onReplace={() => replaceRef.current?.click()} onDelete={() => onDelete(preview)} />

      <Modal open={!!dup} onClose={() => { dup?.resolve('skip'); setDup(null); }} title="You’ve already uploaded this file" size="sm"
        footer={<>
          <button className="btn secondary" onClick={() => { dup.resolve('skip'); setDup(null); }}>Skip</button>
          <button className="btn secondary" onClick={() => { dup.resolve('both'); setDup(null); }}>Keep both</button>
          <button className="btn primary" onClick={() => { dup.resolve('replace'); setDup(null); }}>Replace</button>
        </>}>
        <p className="muted">“{dup?.file.name}” looks the same as <strong>{dup?.existing.name}</strong> in {catLabel(dup?.existing.category)}, uploaded {dup && fmtDate(dup.existing.uploadedAt)}.</p>
      </Modal>
    </div>
  );
}

function PreviewDrawer({ doc, onClose, onReplace, onDelete }) {
  const { updateDocument } = useStore();
  const toast = useToast();
  const [url, setUrl] = useState(null);
  const [text, setText] = useState(null);
  const [state, setState] = useState('loading');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [nameErr, setNameErr] = useState('');
  const blobRef = useRef(null);

  useEffect(() => {
    if (!doc) return;
    setState('loading'); setText(null); setRenaming(false); setName(doc.name); setNameErr('');
    let objectUrl;
    getFile(doc.id).then(async (blob) => {
      if (!blob) { setState('missing'); return; }
      blobRef.current = blob;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      if (doc.ext === 'txt') setText(await blob.text());
      setState('ready');
    }).catch(() => setState('missing'));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [doc?.id, doc?.uploadedAt]); // eslint-disable-line

  if (!doc) return null;
  const cat = DOC_CATEGORIES.find((c) => c.value === doc.category) || DOC_CATEGORIES.at(-1);
  const saveName = () => {
    const n = name.trim();
    if (!n) return setNameErr('The name can’t be empty.');
    if (n.length > 100) return setNameErr('Keep the name under 100 characters.');
    updateDocument(doc.id, { name: n }); setRenaming(false); toast('Document renamed.');
  };
  const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(doc.ext);

  return (
    <Drawer open={!!doc} onClose={onClose} title="Document" size="lg">
      <div className="preview-layout">
        <div className="preview-frame">
          {state === 'loading' && <div className="loading-block"><Spinner />Reading your document…</div>}
          {state === 'missing' && <div className="loading-block" style={{ flexDirection: 'column', textAlign: 'center' }}><AlertCircle size={28} /><span>This file couldn’t be found on this device.</span><button className="btn secondary sm" onClick={onReplace}>Upload it again</button></div>}
          {state === 'ready' && doc.ext === 'pdf' && <iframe title={`Preview of ${doc.name}`} src={url} />}
          {state === 'ready' && isImg && <img src={url} alt={`Preview of ${doc.name}`} />}
          {state === 'ready' && doc.ext === 'txt' && <pre className="txt-preview">{text}</pre>}
          {state === 'ready' && ['doc', 'docx'].includes(doc.ext) && (
            <div className="loading-block" style={{ flexDirection: 'column', textAlign: 'center', gap: 10 }}>
              <FileText size={40} className="muted" />
              <strong>Word documents can’t be previewed in the browser</strong>
              <span className="small muted">Download it to open in Word, Google Docs or a similar app.</span>
              <button className="btn secondary sm" onClick={() => downloadBlob(blobRef.current, doc.originalName)}><Download size={15} />Download</button>
            </div>
          )}
        </div>
        <div className="preview-meta">
          {renaming ? (
            <div className="stack" style={{ gap: 8 }}>
              <Field id="rename" error={nameErr}><input id="rename" className="input" value={name} onChange={(e) => { setName(e.target.value); setNameErr(''); }} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setRenaming(false); }} aria-label="Document name" aria-invalid={!!nameErr} autoFocus /></Field>
              <div className="row"><button className="btn primary sm" onClick={saveName}><Check size={15} />Save name</button><button className="btn ghost sm" onClick={() => { setRenaming(false); setName(doc.name); }}>Cancel</button></div>
            </div>
          ) : (
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <h3 className="serif" style={{ fontSize: 22, wordBreak: 'break-word' }}>{doc.name}</h3>
              <button className="btn icon ghost sm" onClick={() => setRenaming(true)} aria-label="Rename document"><Pencil size={16} /></button>
            </div>
          )}
          <dl className="meta-list">
            <div><dt>File</dt><dd className="truncate">{doc.originalName}</dd></div>
            <div><dt>Type</dt><dd>{doc.ext.toUpperCase()} · {human(doc.size)}</dd></div>
            <div><dt>Uploaded</dt><dd>{fmtDate(doc.uploadedAt, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
          </dl>
          <div className="grid-2" style={{ gap: 10 }}>
            <Field label="Category" id="pv-cat">
              <select id="pv-cat" className="select" value={doc.category} onChange={(e) => { const c = DOC_CATEGORIES.find((x) => x.value === e.target.value); updateDocument(doc.id, { category: c.value, sub: c.subs[0] }); toast(`Moved to ${c.label}.`); }}>
                {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Kind" id="pv-sub">
              <select id="pv-sub" className="select" value={doc.sub} onChange={(e) => { updateDocument(doc.id, { sub: e.target.value }); toast('Updated.'); }}>
                {cat.subs.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Status" id="pv-status">
            <div className="seg" role="group" aria-label="Status">{DOC_STATUSES.map((s) => <button key={s} aria-pressed={doc.status === s} onClick={() => { updateDocument(doc.id, { status: s }); toast(`Marked as ${s.toLowerCase()}.`); }}>{s}</button>)}</div>
          </Field>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn primary block" onClick={() => blobRef.current && downloadBlob(blobRef.current, doc.originalName)} disabled={state !== 'ready'}><Download size={16} />Download</button>
            <div className="row">
              <button className="btn secondary grow" onClick={() => setRenaming(true)}><Pencil size={15} />Rename</button>
              <button className="btn secondary grow" onClick={onReplace}><Replace size={15} />Replace</button>
            </div>
            <button className="btn danger-ghost block" onClick={onDelete}><Trash2 size={15} />Delete</button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
