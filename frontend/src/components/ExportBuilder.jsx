import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { STAT_BY_KEY } from '../lib/helpers.js';
import { fieldCatalog, runCustomExport, runCustomPDF } from '../lib/exporters.js';
import { Confirm, Field, FormError, Icon, Modal, Prompt } from './ui.jsx';
import { fmt } from '../lib/helpers.js';

const FALLBACK = { id: null, name: 'Yangi jadval', mode: 'oila', titleCase: true, cols: ['no', 'boshliq'] };

export default function ExportBuilder({ data, setData, visible, statKey, selection, onClose, toast }) {
  const catalog = useMemo(() => fieldCatalog(data.customFields), [data.customFields]);
  const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));
  const [presetId, setPresetId] = useState(data.presets[0]?.id ?? null);
  const [cfg, setCfg] = useState(() => ({ ...(data.presets[0] || FALLBACK) }));
  const [scope, setScope] = useState('visible');
  const [onlyHits, setOnlyHits] = useState(!!STAT_BY_KEY[statKey]?.mem);
  const [drag, setDrag] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [dialog, setDialog] = useState(null);
  const cols = cfg.cols.filter((c) => byId[c] && !(cfg.mode === 'oila' && byId[c].scope === 'azo'));
  const avail = catalog.filter((c) => !cols.includes(c.id) && !(cfg.mode === 'oila' && c.scope === 'azo'));
  const setCols = (a) => setCfg({ ...cfg, cols: a });
  const move = (i, d) => { const a = [...cols]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setCols(a); };
  const dropAt = (i) => { if (drag == null || drag === i) return; const a = [...cols]; const [x] = a.splice(drag, 1); a.splice(i, 0, x); setCols(a); setDrag(null); };
  const loadPreset = (id) => { const p = data.presets.find((x) => String(x.id) === id); if (p) { setPresetId(p.id); setCfg({ ...p }); } };

  const persist = async (name, asNew) => {
    const body = { name: name.trim(), mode: cfg.mode, titleCase: !!cfg.titleCase, cols };
    const p = asNew || !cfg.id ? await api.createPreset(body) : await api.updatePreset(cfg.id, body);
    setData((d) => ({ ...d, presets: d.presets.some((x) => x.id === p.id) ? d.presets.map((x) => (x.id === p.id ? p : x)) : [...d.presets, p] }));
    setCfg(p); setPresetId(p.id); toast('Shablon saqlandi');
  };
  const savePreset = async (asNew) => {
    if (asNew || !cfg.id) { setDialog({ t: 'prompt', initial: cfg.id ? cfg.name + ' (nusxa)' : cfg.name }); return; }
    setBusy('save'); setErr('');
    try { await persist(cfg.name, false); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const removePreset = () => setDialog({
    t: 'confirm',
    yes: async () => {
      await api.deletePreset(cfg.id);
      const rest = data.presets.filter((x) => x.id !== cfg.id);
      setData((d) => ({ ...d, presets: rest }));
      setCfg({ ...(rest[0] || FALLBACK) }); setPresetId(rest[0]?.id ?? null); toast('Shablon o‘chirildi');
    },
  });
  const run = async (kind) => {
    setBusy(kind); setErr('');
    try {
      const fams = scope === 'visible' ? visible : data.families;
      const fn = kind === 'pdf' ? runCustomPDF : runCustomExport;
      const n = await fn({
        families: fams, cfg, cols, customFields: data.customFields, onlyStat: onlyHits ? STAT_BY_KEY[statKey] : null,
        subtitle: `${scope === 'visible' ? selection : 'Barcha oilalar'}. ${fams.length} oila. Tayyorlangan sana: ${fmt(new Date())}`,
      });
      toast(`${n} qatorli ${kind === 'pdf' ? 'PDF' : 'Excel'} jadval yuklab olindi`);
    } catch (e) { setErr('Faylni tayyorlab bo‘lmadi: ' + e.message); }
    setBusy(false);
  };

  return (
    <Modal title="Jadvalni sozlash va yuklab olish" onClose={onClose} wide
      footer={<>
        <button className="btn ghost" disabled={!!busy} onClick={() => savePreset(true)}>Yangi shablon</button>
        <button className="btn ghost" disabled={!!busy} onClick={() => savePreset(false)}>Shablonni saqlash</button>
        <button className="btn fmt-pdf" disabled={!cols.length || !!busy} onClick={() => run('pdf')}><Icon n="down" s={16} /> {busy === 'pdf' ? 'Tayyorlanmoqda…' : 'PDF'}</button>
        <button className="btn fmt-xls" disabled={!cols.length || !!busy} onClick={() => run('xlsx')}><Icon n="down" s={16} /> {busy === 'xlsx' ? 'Tayyorlanmoqda…' : 'Excel'}</button>
      </>}>
      <div className="grid">
        <Field label="Shablon">
          <div className="inline">
            <select value={presetId ?? ''} onChange={(e) => loadPreset(e.target.value)}>
              {!data.presets.length && <option value="">Shablon yo‘q</option>}
              {data.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {cfg.id && <button type="button" className="icon-btn" aria-label="Shablonni o‘chirish" onClick={removePreset}><Icon n="trash" s={16} /></button>}
          </div>
        </Field>
        <Field label="Shablon nomi"><input value={cfg.name} onChange={(e) => setCfg({ ...cfg, name: e.target.value })} /></Field>
        <Field label="Har bir qatorda" full>
          <div className="seg">
            <button type="button" className={'seg-b' + (cfg.mode === 'oila' ? ' on' : '')} onClick={() => setCfg({ ...cfg, mode: 'oila' })}>bitta oila</button>
            <button type="button" className={'seg-b' + (cfg.mode === 'azo' ? ' on' : '')} onClick={() => setCfg({ ...cfg, mode: 'azo' })}>bitta oila a’zosi</button>
          </div>
        </Field>
        <Field label="Qaysi oilalar">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="visible">Ekrandagi ro‘yxat ({visible.length})</option>
            <option value="all">Barcha oilalar ({data.families.length})</option>
          </select>
        </Field>
        <label className="check"><input type="checkbox" checked={!!cfg.titleCase} onChange={(e) => setCfg({ ...cfg, titleCase: e.target.checked })} /> Ismlarni “Bosh harf bilan” yozish</label>
        {cfg.mode === 'azo' && STAT_BY_KEY[statKey]?.mem && (
          <label className="check"><input type="checkbox" checked={onlyHits} onChange={(e) => setOnlyHits(e.target.checked)} /> Faqat “{STAT_BY_KEY[statKey].label}” guruhidagi a’zolar</label>
        )}
      </div>
      <FormError error={err} />
      <div className="builder">
        <section>
          <h3 className="sec">Jadval ustunlari, tartib bo‘yicha</h3>
          {!cols.length && <p className="muted">O‘ng tomondan ustun qo‘shing.</p>}
          <ol className="colist">
            {cols.map((c, i) => (
              <li key={c} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropAt(i)} onDragEnd={() => setDrag(null)} className={drag === i ? 'dragging' : ''}>
                <span className="grip" aria-hidden="true">⋮⋮</span>
                <span className="cn">{i + 1}</span>
                <span className="cl">{byId[c].label}</span>
                <button className="icon-btn" aria-label="Yuqoriga" disabled={i === 0} onClick={() => move(i, -1)}><Icon n="up" s={16} /></button>
                <button className="icon-btn flip" aria-label="Pastga" disabled={i === cols.length - 1} onClick={() => move(i, 1)}><Icon n="up" s={16} /></button>
                <button className="icon-btn" aria-label="Olib tashlash" onClick={() => setCols(cols.filter((x) => x !== c))}><Icon n="x" s={16} /></button>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3 className="sec">Qo‘shish mumkin bo‘lgan ustunlar</h3>
          {['meta', 'oila', 'azo'].map((sc) => {
            const items = avail.filter((a) => a.scope === sc);
            if (!items.length) return null;
            return (
              <div key={sc} className="avail">
                <p className="avail-h">{{ meta: 'Tartib raqamlari', oila: 'Oila ma’lumotlari', azo: 'A’zo ma’lumotlari' }[sc]}</p>
                {items.map((a) => <button key={a.id} className="addcol" onClick={() => setCols([...cols, a.id])}><Icon n="plus" s={14} />{a.label}</button>)}
              </div>
            );
          })}
        </section>
      </div>
      {dialog?.t === 'prompt' && <Prompt title="Shablonni saqlash" label="Shablon nomi" initial={dialog.initial} onSubmit={(name) => persist(name, true)} onClose={() => setDialog(null)} />}
      {dialog?.t === 'confirm' && <Confirm text={`“${cfg.name}” shabloni o‘chiriladi. Shu shablon bilan yuklab olingan fayllar o‘chmaydi.`} action="Shablonni o‘chirish" onYes={dialog.yes} onClose={() => setDialog(null)} />}
    </Modal>
  );
}
