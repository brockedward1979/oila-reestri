import { useMemo } from 'react';
import { STATS, countStat } from '../lib/helpers.js';

const pct = (v, base) => (base ? Math.round((v / base) * 100) : 0);
const TOIFA_COLOR = { k: '#F4B740', c: '#5CC08A', d: '#F2788A' };
const KID_LABEL = { bogchagacha: ['Bog‘chagacha', '0–2 yosh'], bogcha: ['Bog‘cha yoshi', '3–6 yosh'], maktab: ['Maktab', 'o‘quvchilari'], talaba: ['Talaba', 'va o‘quvchi'] };

/** Toifalar uchun halqa diagramma. */
function Donut({ parts, total }) {
  const R = 40, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <svg viewBox="0 0 110 110" className="donut" aria-hidden="true">
      <circle cx="55" cy="55" r={R} fill="none" className="donut-bg" strokeWidth="16" />
      {parts.map((p) => {
        const len = total ? (p.v / total) * C : 0;
        const el = <circle key={p.k} cx="55" cy="55" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 55 55)" strokeLinecap="butt" />;
        off += len;
        return el;
      })}
      <text x="55" y="53" textAnchor="middle" className="donut-n">{total}</text>
      <text x="55" y="69" textAnchor="middle" className="donut-l">oila</text>
    </svg>
  );
}

function Row({ s, v, base, on, onPick, color }) {
  return (
    <button className={'lrow' + (on ? ' on' : '') + (v ? '' : ' zero')} aria-pressed={on} onClick={() => onPick(s.k)}
      title={`${s.label}: ${v}. Bosing — ro‘yxatda faqat shu guruh qoladi`}>
      {color && <i className="dot" style={{ background: color }} aria-hidden="true" />}
      <span className="lr-l">{s.label}</span>
      <span className="lr-v num">{v}<small>{pct(v, base)}%</small></span>
    </button>
  );
}

/** Jami ko'rsatkichlar paneli: har bir guruh o'z rangli kartasida, hammasi bosiladi va ro'yxatni filtrlaydi. */
export default function Ledger({ fams, statKey, onPick, selection }) {
  const t = useMemo(() => Object.fromEntries(STATS.flatMap((g) => g.items).map((s) => [s.k, countStat(s, fams)])), [fams]);
  const n = t.oila, M = t.azo;
  const toifa = STATS[0].items.slice(1);
  const kids = STATS[2].items;
  const maxKid = Math.max(1, ...kids.map((s) => t[s.k]));
  const kidColors = ['#B8A6FF', '#FF9FB2', '#FFC861', '#8FC8FF'];
  return (
    <div className="ledger">
      <header className="lg-head">
        <p className="lg-kicker">Jami ko‘rsatkichlar</p>
        <h2 className="lg-title">{selection}</h2>
        <p className="lg-sum"><b className="num">{n}</b> oila · <b className="num">{M}</b> kishi</p>
      </header>

      <section className="lcard lc-lav">
        <h3>Oila toifasi</h3>
        <div className="lc-donut">
          <Donut total={n} parts={toifa.map((s) => ({ k: s.k, v: t[s.k], color: TOIFA_COLOR[s.tone] }))} />
          <div className="lc-legend">
            {toifa.map((s) => <Row key={s.k} s={s} v={t[s.k]} base={n} on={statKey === s.k} onPick={onPick} color={TOIFA_COLOR[s.tone]} />)}
          </div>
        </div>
      </section>

      <section className="lcard lc-pink">
        <h3>Jinsi</h3>
        <div className="lg-split" aria-hidden="true">
          {t.ayol ? <i style={{ flexGrow: t.ayol, background: '#FF9FB2' }} /> : null}
          {t.erkak ? <i style={{ flexGrow: t.erkak, background: '#8FB4FF' }} /> : null}
        </div>
        <div className="lg-pair">
          <button className={'pair' + (statKey === 'ayol' ? ' on' : '')} onClick={() => onPick('ayol')}><i className="dot" style={{ background: '#FF9FB2' }} /><b className="num">{t.ayol}</b> ayol <small>{pct(t.ayol, M)}%</small></button>
          <button className={'pair' + (statKey === 'erkak' ? ' on' : '')} onClick={() => onPick('erkak')}><i className="dot" style={{ background: '#8FB4FF' }} /><b className="num">{t.erkak}</b> erkak <small>{pct(t.erkak, M)}%</small></button>
        </div>
      </section>

      <section className="lcard lc-sun">
        <h3>Bolalar</h3>
        <div className="bars">
          {kids.map((s, i) => (
            <button key={s.k} className={'bar' + (statKey === s.k ? ' on' : '')} onClick={() => onPick(s.k)} aria-pressed={statKey === s.k} title={s.label}>
              <b className="num">{t[s.k]}</b>
              <span className="bar-track"><i style={{ height: `${Math.max(t[s.k] ? 6 : 0, (t[s.k] / maxKid) * 100)}%`, background: kidColors[i] }} /></span>
              <span className="bar-l">{KID_LABEL[s.k]?.[0] || s.label}<small>{KID_LABEL[s.k]?.[1]}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="lcard lc-sky">
        <h3>Bandlik</h3>
        {STATS[3].items.map((s) => <Row key={s.k} s={s} v={t[s.k]} base={M} on={statKey === s.k} onPick={onPick} />)}
      </section>

      <section className="lcard lc-mint">
        <h3>Ijtimoiy holat</h3>
        {STATS[4].items.map((s) => <Row key={s.k} s={s} v={t[s.k]} base={M} on={statKey === s.k} onPick={onPick} />)}
      </section>
      <p className="lg-note">Foiz toifada oilalar sonidan, qolganida oila a’zolari sonidan olingan. Istalgan ko‘rsatkichni bossangiz, ro‘yxatda faqat shu guruh qoladi.</p>
    </div>
  );
}
