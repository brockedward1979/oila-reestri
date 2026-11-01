import { useEffect, useRef, useState } from 'react';
import { TOIFA, duration, famSummary, head, info, memberHit, sortedMembers } from '../lib/helpers.js';
import { famDOCX, famDocHTML, famPDF, famXLSX } from '../lib/exporters.js';
import { Avatar, Icon, Toifa } from './ui.jsx';

function MemberRow({ m, f, hit, actions }) {
  const i = info(m);
  const isHead = m.qarindoshlik === 'Arizachi';
  return (
    <li className={'mem' + (hit ? ' hit' : '')}>
      <Avatar src={isHead ? f.rasm : null} name={m.fio} />
      <div className="mem-main">
        <span className="mem-name">{m.fio}</span>
        <span className="mem-rel">{isHead ? 'Oila boshlig‘i (arizachi)' : m.qarindoshlik || 'Qarindoshlik ko‘rsatilmagan'}</span>
      </div>
      <dl className="mem-facts">
        <div><dt>Yoshi</dt><dd>{i.age != null ? `${i.age} yosh` : '—'}{i.jins && <span className="muted">, {i.jins.toLowerCase()}</span>}</dd></div>
        <div><dt>JSHSHIR</dt><dd className="num">{m.jshshir || '—'}</dd></div>
        {(m.oquvJoyi || m.ishJoyi) && <div><dt>{m.oquvJoyi ? 'O‘qish joyi' : 'Ish joyi'}</dt><dd>{m.oquvJoyi || m.ishJoyi}{m.sinf && `, ${m.sinf}`}</dd></div>}
      </dl>
      <div className="mem-tags">
        {(m.holat || []).map((t) => <span key={t} className="tg">{t}</span>)}
        {m.nogironlik && <span className="tg ng">Nogironlik: {m.nogironlik}</span>}
      </div>
      <div className="mem-act">
        {!isHead && <button className="icon-btn" title="Oila boshlig‘i qilish" aria-label="Oila boshlig‘i qilish" onClick={actions.makeHead}><Icon n="crown" s={16} /></button>}
        <button className="icon-btn" aria-label="Tahrirlash" onClick={actions.edit}><Icon n="edit" s={16} /></button>
        <button className="icon-btn" aria-label="O‘chirish" onClick={actions.remove}><Icon n="trash" s={16} /></button>
      </div>
    </li>
  );
}

function DocPreview({ html }) {
  const wrap = useRef(); const inner = useRef();
  const [k, setK] = useState(1); const [hgt, setH] = useState(0); const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const fit = () => { const w = wrap.current?.clientWidth || 1; const s = zoom ? 1 : Math.min(1, w / 1060); setK(s); setH((inner.current?.scrollHeight || 0) * s); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(wrap.current); return () => ro.disconnect();
  }, [html, zoom]);
  return (
    <>
      {k < 0.95 || zoom ? <button className="btn ghost sm zoom-b" onClick={() => setZoom(!zoom)}>{zoom ? 'Ekranga sig‘dirish' : 'Asl o‘lchamda ko‘rish'}</button> : null}
      <div className={'docwrap' + (zoom ? ' zoomed' : '')} ref={wrap} style={{ height: zoom ? undefined : hgt || undefined }}>
        <div ref={inner} className="docscale" style={{ transform: `scale(${k})` }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  );
}

function DocBox({ f, customFields, toast }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const box = useRef();
  const run = async (kind, fn) => {
    setBusy(kind);
    try { await fn(f, customFields); toast(`${kind} fayl yuklab olindi`); } catch (e) { console.error(e); toast(`${kind} faylni tayyorlab bo‘lmadi`); }
    setBusy('');
  };
  const close = () => { setOpen(false); box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  return (
    <div className={'docbox' + (open ? ' open' : '')} ref={box}>
      <button className="docbox-h" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <span className="docbox-ic" aria-hidden="true"><Icon n="doc" s={20} /></span>
        <span className="docbox-t"><b>Oila ma’lumotnomasi</b><span>{open ? 'Ko‘rib chiqing va kerakli formatda yuklab oling' : 'Ko‘rish va PDF, Word, Excel ko‘rinishida yuklab olish'}</span></span>
        <span className="docbox-tg">{open ? 'Yopish' : 'Ochish'} <Icon n={open ? 'up' : 'chev'} s={16} /></span>
      </button>
      {open && (
        <div className="docbox-b">
          <div className="row-gap">
            <button className="btn sm fmt-pdf" disabled={!!busy} onClick={() => run('PDF', famPDF)}><Icon n="down" s={16} /> {busy === 'PDF' ? 'Tayyorlanmoqda…' : 'PDF'}</button>
            <button className="btn sm fmt-doc" disabled={!!busy} onClick={() => run('Word', famDOCX)}><Icon n="down" s={16} /> {busy === 'Word' ? 'Tayyorlanmoqda…' : 'Word'}</button>
            <button className="btn sm fmt-xls" disabled={!!busy} onClick={() => run('Excel', famXLSX)}><Icon n="down" s={16} /> {busy === 'Excel' ? 'Tayyorlanmoqda…' : 'Excel'}</button>
          </div>
          <DocPreview html={famDocHTML(f, customFields)} />
          <button className="docbox-close" onClick={close}><Icon n="up" s={16} /> Ma’lumotnomani yopish</button>
        </div>
      )}
    </div>
  );
}

export default function FamilyItem({ f, idx, open, onToggle, stat, ops, customFields, toast }) {
  const h = head(f);
  const hits = stat?.mem ? f.azolar.filter((m) => memberHit(stat, m)).length : 0;
  const isKid = (m) => m.qarindoshlik !== 'Arizachi' && info(m).age != null && info(m).age < 18;
  const kids = f.azolar.filter(isKid).length;
  const sorted = sortedMembers(f);
  const groups = [
    { k: 'adult', t: 'Kattalar', list: sorted.filter((m) => !isKid(m)) },
    { k: 'kid', t: 'Bolalar (18 yoshgacha)', list: sorted.filter(isKid) },
  ].filter((g) => g.list.length);
  return (
    <li className={'fam' + (open ? ' open' : '')}>
      <button className="fam-row" aria-expanded={open} onClick={onToggle}>
        <span className="c-no num">{idx + 1}</span>
        <Avatar src={f.rasm} name={h?.fio} />
        <span className="c-name">
          <span className="fam-name">{h?.fio || 'Oila boshlig‘i yo‘q'}</span>
          <span className="fam-sub num">{h?.jshshir}</span>
        </span>
        <span className="c-toifa"><Toifa t={f.toifa} /></span>
        <span className="c-n"><b className="num">{f.azolar.length}</b><span className="lbl"> kishi</span>{kids > 0 && <span className="mob">, <b className="num">{kids}</b> bola</span>}</span>
        <span className="c-k"><b className="num">{kids}</b><span className="lbl"> bola</span></span>
        <span className="c-tel num">{f.telefon || <span className="muted">—</span>}</span>
        <span className="c-reg num">{f.reyestrSana}</span>
        {stat?.mem ? <span className="c-hit">{hits} ta mos</span> : null}
        <span className="c-chev"><Icon n="chev" /></span>
      </button>
      {open && (
        <div className="fam-panel">
          <div className="pgroups">
            <section className="pg pg-oila">
              <h3>Oila haqida</h3>
              <dl className="facts">
                <div><dt>Toifa</dt><dd>{TOIFA[f.toifa]?.label}</dd></div>
                <div><dt>Mahalla</dt><dd>{f.mahalla || '—'}</dd></div>
                <div><dt>Telefon</dt><dd className="num">{f.telefon || '—'}</dd></div>
                <div><dt>Daromad</dt><dd className="num">{Number(f.daromad || 0).toLocaleString('ru-RU')} so‘m</dd></div>
                <div className="wide"><dt>Manzil</dt><dd>{f.manzil || '—'}</dd></div>
                {customFields.filter((c) => c.scope === 'oila').map((c) => <div key={c.id}><dt>{c.label}</dt><dd>{f.extra?.[c.id] || '—'}</dd></div>)}
              </dl>
            </section>
            <section className="pg pg-reyestr">
              <h3>Reyestr ma’lumotlari</h3>
              <dl className="facts">
                <div><dt>Hujjat raqami</dt><dd className="num">{f.hujjatRaqami || '—'}</dd></div>
                <div><dt>Savolnoma ID</dt><dd className="num">{f.savolnomaId || '—'}</dd></div>
                <div><dt>Reyestrga kirgan</dt><dd className="num">{f.reyestrSana || '—'}</dd></div>
                <div><dt>Turgan muddati</dt><dd>{duration(f.reyestrSana) || '—'}</dd></div>
              </dl>
            </section>
            <section className="pg pg-tarkib">
              <h3>Tarkib</h3>
              <div className="mini">{famSummary(f).map((x) => <div key={x.l}><b className="num">{x.v}</b><span>{x.l}</span></div>)}</div>
            </section>
          </div>
          {f.izoh && <p className="izoh"><b>Izoh:</b> {f.izoh}</p>}
          <div className="panel-act">
            <button className="btn sm" onClick={ops.addMember}><Icon n="plus" s={16} /> A’zo qo‘shish</button>
            <button className="btn ghost sm" onClick={ops.editFamily}><Icon n="edit" s={16} /> Oilani tahrirlash</button>
            <button className="btn ghost sm danger-t" onClick={ops.removeFamily}><Icon n="trash" s={16} /> Oilani o‘chirish</button>
          </div>
          <DocBox f={f} customFields={customFields} toast={toast} />
          {groups.map((g) => (
            <section key={g.k} className={'mg mg-' + g.k}>
              <h3>{g.t}, {g.list.length} kishi</h3>
              <ul className="mems">
                {g.list.map((m) => (
                  <MemberRow key={m.id} m={m} f={f} hit={memberHit(stat, m)} actions={{ edit: () => ops.editMember(m), remove: () => ops.removeMember(m), makeHead: () => ops.makeHead(m) }} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </li>
  );
}

