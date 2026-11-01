import { useRef, useState } from 'react';
import { api } from '../api.js';
import { saveBlob, today } from '../lib/exporters.js';
import { Confirm, Field, FormError, Icon, Modal } from './ui.jsx';

const TYPE_LABEL = { text: 'matn', number: 'raqam', date: 'sana', select: 'tanlov' };

export default function Settings({ data, setData, reload, onClose, toast }) {
  const [s, setS] = useState(data.settings);
  const [nf, setNf] = useState({ label: '', scope: 'azo', type: 'text', options: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const fileRef = useRef();

  const wrap = async (fn) => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr(e.message); } setBusy(false); };
  const addField = () => wrap(async () => {
    const c = await api.addCustomField({ label: nf.label.trim(), scope: nf.scope, type: nf.type, options: nf.options.split(',').map((x) => x.trim()).filter(Boolean) });
    setData((d) => ({ ...d, customFields: [...d.customFields, c] }));
    setNf({ label: '', scope: nf.scope, type: 'text', options: '' }); toast('Ustun qo‘shildi');
  });
  const removeField = (c) => setPending({
    text: `“${c.label}” ustuni o‘chiriladi. Unga kiritilgan qiymatlar jadvallarda ko‘rinmay qoladi.`, action: 'Ustunni o‘chirish',
    yes: async () => { await api.deleteCustomField(c.id); setData((d) => ({ ...d, customFields: d.customFields.filter((y) => y.id !== c.id) })); toast('Ustun o‘chirildi'); },
  });
  const saveSettings = () => wrap(async () => {
    const out = await api.saveSettings(s);
    setData((d) => ({ ...d, settings: out })); toast('Sozlamalar saqlandi'); onClose();
  });
  const backup = () => wrap(async () => {
    const b = await api.backup();
    saveBlob(new Blob([JSON.stringify(b)], { type: 'application/json' }), `oila_reestri_zaxira_${today()}.json`);
    toast('Zaxira nusxa yuklab olindi');
  });
  const pickRestore = async (file) => {
    let payload;
    try { payload = JSON.parse(await file.text()); if (!Array.isArray(payload.families)) throw new Error(); } catch { setErr('Bu fayl reestr zaxirasi emas'); return; }
    setPending({
      text: `Fayldagi ${payload.families.length} ta oila yuklanadi. Hozirgi barcha ma’lumotlar o‘chirilib, fayldagilar bilan almashtiriladi.`, action: 'Almashtirish',
      yes: async () => { const r = await api.restore(payload, 'replace'); await reload(); toast(`${r.added} ta oila yuklandi${r.errors.length ? `, ${r.errors.length} tasida xato` : ''}`); onClose(); },
    });
  };

  return (
    <Modal title="Sozlamalar" onClose={onClose} wide
      footer={<><button className="btn ghost" onClick={onClose}>Yopish</button><button className="btn" disabled={busy} onClick={saveSettings}>Saqlash</button></>}>
      <FormError error={err} />
      <h3 className="sec">Qo‘shimcha ustunlar</h3>
      <p className="muted">Bu yerda qo‘shilgan maydonlar oila yoki a’zo shaklida chiqadi va eksportda ustun sifatida tanlanadi.</p>
      {data.customFields.length > 0 && (
        <ul className="cf-list">
          {data.customFields.map((c) => (
            <li key={c.id}>
              <span><b>{c.label}</b> <span className="muted">{c.scope === 'oila' ? 'oila' : 'a’zo'} maydoni, {TYPE_LABEL[c.type]}{c.options?.length ? `: ${c.options.join(', ')}` : ''}</span></span>
              <button className="icon-btn" aria-label={`${c.label} ustunini o‘chirish`} onClick={() => removeField(c)}><Icon n="trash" s={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid">
        <Field label="Ustun nomi"><input value={nf.label} placeholder="Masalan: Uy-joy holati" onChange={(e) => setNf({ ...nf, label: e.target.value })} /></Field>
        <Field label="Kimga tegishli"><select value={nf.scope} onChange={(e) => setNf({ ...nf, scope: e.target.value })}><option value="azo">Har bir a’zoga</option><option value="oila">Butun oilaga</option></select></Field>
        <Field label="Turi"><select value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })}><option value="text">Matn</option><option value="number">Raqam</option><option value="date">Sana</option><option value="select">Ro‘yxatdan tanlash</option></select></Field>
        {nf.type === 'select' && <Field label="Variantlar (vergul bilan)"><input value={nf.options} placeholder="yaxshi, o‘rtacha, yomon" onChange={(e) => setNf({ ...nf, options: e.target.value })} /></Field>}
        <div className="fld end"><button className="btn ghost" onClick={addField} disabled={busy || !nf.label.trim() || (nf.type === 'select' && !nf.options.trim())}><Icon n="plus" s={16} /> Ustun qo‘shish</button></div>
      </div>
      <h3 className="sec">Standart jadval</h3>
      <div className="grid">
        <Field label="Mahalla ustunida yoziladigan nom"><input value={s.stdMahalla} onChange={(e) => setS({ ...s, stdMahalla: e.target.value })} /></Field>
        <Field label="Varaq nomi"><input value={s.stdSheet} onChange={(e) => setS({ ...s, stdSheet: e.target.value })} /></Field>
        <Field label="Yangi oilalar uchun mahalla"><input value={s.defaultMahalla} onChange={(e) => setS({ ...s, defaultMahalla: e.target.value })} /></Field>
      </div>
      <h3 className="sec">Zaxira nusxa</h3>
      <p className="muted">Ma’lumotlar serverdagi bazada saqlanadi. Zaxira nusxa — qo‘shimcha himoya va boshqa joyga ko‘chirish uchun.</p>
      <div className="row-gap">
        <button className="btn ghost" disabled={busy} onClick={backup}><Icon n="down" s={16} /> Zaxirani yuklab olish</button>
        <button className="btn ghost danger-t" disabled={busy} onClick={() => fileRef.current.click()}>Zaxiradan tiklash</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const fl = e.target.files[0]; e.target.value = ''; if (fl) pickRestore(fl); }} />
      </div>
      {pending && <Confirm text={pending.text} action={pending.action} onYes={pending.yes} onClose={() => setPending(null)} />}
    </Modal>
  );
}
