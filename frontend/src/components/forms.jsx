import { useRef, useState } from 'react';
import {
  DISABILITY, TOIFA, emptyMember, fmt, formatPhone, fromJSH, head, withDerived,
} from '../lib/helpers.js';
import { Avatar, CustomInputs, DateInput, Field, FormError, Icon, Modal, TagPicker, resizeImage } from './ui.jsx';

export function MemberFields({ m, set, ctx }) {
  const j = fromJSH(m.jshshir);
  const owner = m.jshshir && ctx.allJsh.get(m.jshshir);
  const dup = owner && owner.id !== m.id;
  let jshHint = 'Kiritilganda tug‘ilgan sana va jinsi o‘zi to‘ldiriladi';
  if (dup) jshHint = `Bu JSHSHIR ${owner.fio} uchun kiritilgan`;
  else if (m.jshshir && !j) jshHint = `14 ta raqam bo‘lishi kerak (hozir ${m.jshshir.length} ta)`;
  return (
    <>
      <Field label="F.I.Sh. *" full>
        <input value={m.fio} required autoComplete="off" onChange={(e) => set({ fio: e.target.value.toUpperCase() })} placeholder="FAMILIYA ISM OTASINING ISMI" />
      </Field>
      <Field label="Qarindoshlik darajasi">
        <input list="rel-list" value={m.qarindoshlik} placeholder="Ro‘yxatdan tanlang yoki yozing" onChange={(e) => set({ qarindoshlik: e.target.value })} />
      </Field>
      <Field label="JSHSHIR" hint={jshHint} warn={dup || (m.jshshir && !j)}>
        <input inputMode="numeric" maxLength={14} value={m.jshshir} className={dup ? 'warn' : ''} autoComplete="off"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            const jj = fromJSH(v);
            set(jj ? { jshshir: v, tugilganSana: fmt(jj.dob), jinsi: jj.jins } : { jshshir: v });
          }} />
      </Field>
      <Field label="Tug‘ilgan sana" hint={j && m.tugilganSana && m.tugilganSana !== fmt(j.dob) ? `JSHSHIR bo‘yicha ${fmt(j.dob)}` : ''}>
        <DateInput value={m.tugilganSana} onChange={(v) => set({ tugilganSana: v })} />
      </Field>
      <Field label="Jinsi">
        <select value={m.jinsi} onChange={(e) => set({ jinsi: e.target.value })}><option value="">—</option><option>Ayol</option><option>Erkak</option></select>
      </Field>
      <Field label="Holati" full><TagPicker value={m.holat || []} onChange={(holat) => set({ holat })} extra={ctx.extraTags} /></Field>
      <Field label="Nogironlik">
        <select value={m.nogironlik} onChange={(e) => set({ nogironlik: e.target.value })}>{DISABILITY.map((d) => <option key={d} value={d}>{d || 'Yo‘q'}</option>)}</select>
      </Field>
      <Field label="Qayerda o‘qiydi"><input list="school-list" value={m.oquvJoyi} placeholder="Masalan: 14-son maktab" onChange={(e) => set({ oquvJoyi: e.target.value })} /></Field>
      <Field label="Sinf / kurs"><input value={m.sinf} onChange={(e) => set({ sinf: e.target.value })} /></Field>
      <Field label="Ish joyi"><input value={m.ishJoyi} onChange={(e) => set({ ishJoyi: e.target.value })} /></Field>
      <Field label="Telefon"><input inputMode="tel" value={m.telefon} placeholder="+998 __ ___ __ __" onChange={(e) => set({ telefon: formatPhone(e.target.value) })} /></Field>
      <CustomInputs fields={ctx.customFields} scope="azo" value={m.extra} onChange={(extra) => set({ extra })} />
      <Field label="Izoh" full><textarea rows={2} value={m.izoh} onChange={(e) => set({ izoh: e.target.value })} /></Field>
    </>
  );
}

function useSubmit(onSave) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (payload) => {
    setBusy(true); setErr('');
    try { await onSave(payload); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return { busy, err, submit };
}

export function MemberForm({ initial, onSave, onClose, ctx, isNew }) {
  const [m, setM] = useState(() => withDerived({ ...emptyMember(), ...initial }));
  const set = (p) => setM((x) => ({ ...x, ...p }));
  const { busy, err, submit } = useSubmit(onSave);
  const ok = m.fio.trim() && (!m.jshshir || fromJSH(m.jshshir));
  return (
    <Modal title={isNew ? 'A’zo qo‘shish' : 'A’zoni tahrirlash'} onClose={onClose}
      footer={<>
        <button className="btn ghost" type="button" onClick={onClose}>Bekor qilish</button>
        <button className="btn" type="submit" form="member-form" disabled={!ok || busy}>{busy ? 'Saqlanmoqda…' : isNew ? 'A’zoni qo‘shish' : 'Saqlash'}</button>
      </>}>
      <form id="member-form" className="grid" onSubmit={(e) => { e.preventDefault(); if (ok) submit(m); }}>
        <MemberFields m={m} set={set} ctx={ctx} />
      </form>
      <FormError error={err} />
    </Modal>
  );
}

export function FamilyForm({ initial, isNew, onSave, onClose, ctx }) {
  const [f, setF] = useState(() => initial);
  const [ap, setAp] = useState(() => ({ ...emptyMember(), qarindoshlik: 'Arizachi' }));
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const fileRef = useRef();
  const { busy, err, submit } = useSubmit(onSave);
  const [imgErr, setImgErr] = useState('');
  const ok = isNew ? ap.fio.trim() && (!ap.jshshir || fromJSH(ap.jshshir)) : true;
  const save = () => { if (ok) submit(isNew ? { ...f, azolar: [ap] } : f); };
  return (
    <Modal title={isNew ? 'Yangi oila' : 'Oila ma’lumotlari'} onClose={onClose} wide
      footer={<>
        <button className="btn ghost" type="button" onClick={onClose}>Bekor qilish</button>
        <button className="btn" type="submit" form="family-form" disabled={!ok || busy}>{busy ? 'Saqlanmoqda…' : isNew ? 'Oilani qo‘shish' : 'Saqlash'}</button>
      </>}>
      <form id="family-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="photo-row">
          <Avatar src={f.rasm} name={isNew ? ap.fio : head(f)?.fio} big />
          <div>
            <p className="muted">Ariza beruvchining rasmi jadvalda ko‘rinadi.</p>
            <div className="row-gap">
              <button type="button" className="btn ghost sm" onClick={() => fileRef.current.click()}><Icon n="camera" s={16} /> {f.rasm ? 'Rasmni almashtirish' : 'Rasm yuklash'}</button>
              {f.rasm && <button type="button" className="btn ghost sm" onClick={() => set({ rasm: '' })}>Olib tashlash</button>}
            </div>
            {imgErr && <p className="form-err">{imgErr}</p>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
              const fl = e.target.files[0]; e.target.value = '';
              if (!fl) return;
              try { set({ rasm: await resizeImage(fl) }); setImgErr(''); } catch { setImgErr('Bu faylni rasm sifatida o‘qib bo‘lmadi'); }
            }} />
          </div>
        </div>
        {isNew && (<>
          <h3 className="sec">Oila boshlig‘i (ariza beruvchi)</h3>
          <div className="grid"><MemberFields m={ap} set={(p) => setAp((x) => ({ ...x, ...p }))} ctx={ctx} /></div>
        </>)}
        <h3 className="sec">Oila</h3>
        <div className="grid">
          <Field label="Toifa" full>
            <div className="seg" role="radiogroup" aria-label="Toifa">
              {Object.entries(TOIFA).map(([k, v]) => (
                <button type="button" role="radio" aria-checked={f.toifa === k} key={k} className={'seg-b t-' + k + (f.toifa === k ? ' on' : '')} onClick={() => set({ toifa: k })}>{v.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Mahalla"><input value={f.mahalla} onChange={(e) => set({ mahalla: e.target.value })} /></Field>
          <Field label="Telefon raqami"><input inputMode="tel" value={f.telefon} placeholder="+998 __ ___ __ __" onChange={(e) => set({ telefon: formatPhone(e.target.value) })} /></Field>
          <Field label="Manzil" full><input value={f.manzil} placeholder="Ko‘cha, uy raqami" onChange={(e) => set({ manzil: e.target.value })} /></Field>
          <Field label="Hujjat raqami"><input value={f.hujjatRaqami} onChange={(e) => set({ hujjatRaqami: e.target.value })} /></Field>
          <Field label="Reyestrga kirgan sana"><DateInput value={f.reyestrSana} onChange={(v) => set({ reyestrSana: v })} /></Field>
          <Field label="Savolnoma ID"><input value={f.savolnomaId} onChange={(e) => set({ savolnomaId: e.target.value })} /></Field>
          <Field label="Daromad (so‘m)"><input type="number" min="0" value={f.daromad} onChange={(e) => set({ daromad: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          <CustomInputs fields={ctx.customFields} scope="oila" value={f.extra} onChange={(extra) => set({ extra })} />
          <Field label="Izoh" full><textarea rows={2} value={f.izoh} onChange={(e) => set({ izoh: e.target.value })} /></Field>
        </div>
      </form>
      <FormError error={err} />
    </Modal>
  );
}
