// Bridgenote: school messages sent to each family in their own language, and their replies translated back.
import { useMemo, useState } from "react";
import { waLink } from "./lib/share";
import { uid, useCopy, useStored } from "./lib/store";
import { Section, Stat, Stats } from "./ui/kit";

const T = "bridgenote";
type Lang = "en" | "fr" | "ar";
const LANGS: Record<Lang, string> = { en: "English", fr: "Français", ar: "العربية" };
type Tpl = { id: string; name: string; fields: string[]; text: Record<Lang, string> };
const TPLS: Tpl[] = [
  { id: "trip", name: "Class trip", fields: ["place", "date", "amount", "deadline"], text: {
    en: "Reminder: our class trip to {place} is on {date}. Please send the signed form and {amount} by {deadline}.",
    fr: "Rappel : la sortie de classe à {place} aura lieu le {date}. Merci de rendre l'autorisation signée et {amount} avant le {deadline}.",
    ar: "تذكير: الرحلة المدرسية إلى {place} ستكون يوم {date}. يرجى إرسال الترخيص الموقّع و{amount} قبل {deadline}." } },
  { id: "meeting", name: "Parent meetings", fields: ["date", "time"], text: {
    en: "Parent-teacher meetings are on {date} from {time}. Please reply with a time that suits you.",
    fr: "Les réunions parents-professeurs auront lieu le {date} à partir de {time}. Merci de répondre avec l'horaire qui vous convient.",
    ar: "ستُعقد اجتماعات الأولياء والأساتذة يوم {date} ابتداءً من الساعة {time}. يرجى الرد بالموعد الذي يناسبكم." } },
  { id: "absence", name: "Absence", fields: ["child"], text: {
    en: "{child} was absent today. Please let us know the reason.",
    fr: "{child} était absent(e) aujourd'hui. Merci de nous indiquer le motif de l'absence.",
    ar: "تغيّب {child} اليوم. يرجى إعلامنا بسبب الغياب." } },
  { id: "closure", name: "School closed", fields: ["date", "deadline"], text: {
    en: "The school will be closed on {date}. Classes resume on {deadline}.",
    fr: "L'école sera fermée le {date}. Les cours reprendront le {deadline}.",
    ar: "ستكون المدرسة مغلقة يوم {date}. تُستأنف الدروس يوم {deadline}." } },
  { id: "bring", name: "Bring something", fields: ["child", "item", "date"], text: {
    en: "Please make sure {child} brings {item} on {date}.",
    fr: "Merci de veiller à ce que {child} apporte {item} le {date}.",
    ar: "يرجى التأكد من أن {child} سيُحضر {item} يوم {date}." } },
  { id: "praise", name: "Good news", fields: ["child"], text: {
    en: "{child} did excellent work this week. Thank you for your support at home!",
    fr: "{child} a fourni un excellent travail cette semaine. Merci pour votre soutien à la maison !",
    ar: "قدّم {child} عملاً ممتازاً هذا الأسبوع. شكراً على دعمكم في المنزل!" } },
  { id: "lice", name: "Head lice", fields: [], text: {
    en: "There is a case of head lice in the class. Please check your child's hair and treat if needed.",
    fr: "Un cas de poux a été signalé dans la classe. Merci de vérifier les cheveux de votre enfant et de le traiter si nécessaire.",
    ar: "تم تسجيل حالة قمل في القسم. يرجى فحص شعر طفلكم ومعالجته عند الحاجة." } },
];
const FIELD_LABEL: Record<string, string> = { place: "Place", date: "Date", amount: "Amount", deadline: "Deadline", time: "Time", child: "Child's name", item: "What to bring" };
type Family = { id: string; child: string; parent: string; phone: string; lang: Lang };
type Translator = { create(o: { sourceLanguage: string; targetLanguage: string }): Promise<{ translate(s: string): Promise<string> }> };

export default function Bridgenote() {
  const [fams, setFams] = useStored<Family[]>(T, "fams", [
    { id: "f1", child: "Adam", parent: "Mme Haddad", phone: "", lang: "fr" }, { id: "f2", child: "Yasmine", parent: "Mr. Brown", phone: "", lang: "en" },
    { id: "f3", child: "Omar", parent: "السيد الطرابلسي", phone: "", lang: "ar" }, { id: "f4", child: "Lina", parent: "Mme Ben Ali", phone: "", lang: "fr" }, { id: "f5", child: "Karim", parent: "السيدة منصور", phone: "", lang: "ar" },
  ]);
  const [teacher, setTeacher] = useStored(T, "teacher", "Mme Karoui, 4B");
  const [tid, setTid] = useState("trip");
  const [vals, setVals] = useState<Record<string, string>>({ place: "Carthage museum", date: "14/10", amount: "15 TND", deadline: "10/10", time: "16:00", item: "a packed lunch" });
  const [custom, setCustom] = useState("");
  const [customOut, setCustomOut] = useState<Partial<Record<Lang, string>>>({});
  const [reply, setReply] = useState("");
  const [replyOut, setReplyOut] = useState("");
  const [msg, setMsg] = useState("");
  const [nf, setNf] = useState<Family>({ id: "", child: "", parent: "", phone: "", lang: "fr" });
  const { copy, copied } = useCopy();
  const tr = (globalThis as unknown as { Translator?: Translator }).Translator;
  const tpl = TPLS.find(t => t.id === tid)!;
  const fill = (text: string, f?: Family) => text.replace(/\{(\w+)\}/g, (_, k) => (k === "child" && f ? f.child : vals[k] || `[${FIELD_LABEL[k] ?? k}]`));
  const langs = useMemo(() => [...new Set(fams.map(f => f.lang))], [fams]);
  const messageFor = (f: Family) => (custom.trim() ? customOut[f.lang] ?? (f.lang === "en" ? custom : "") : fill(tpl.text[f.lang], f)) + `\n\n${teacher}`;

  const translateCustom = async () => {
    const out: Partial<Record<Lang, string>> = { en: custom };
    if (tr) { try { setMsg("Translating on this device…"); for (const l of langs.filter(l => l !== "en")) out[l] = await (await tr.create({ sourceLanguage: "en", targetLanguage: l })).translate(custom); setMsg(""); } catch { setMsg("The built-in translator could not do this pair. Use the Google Translate buttons instead."); } }
    else setMsg("Your browser has no built-in translator. Use the Google Translate buttons, then paste the result below each language.");
    setCustomOut(out);
  };
  const translateReply = async () => {
    if (tr) { try { setReplyOut(await (await tr.create({ sourceLanguage: /[؀-ۿ]/.test(reply) ? "ar" : "fr", targetLanguage: "en" })).translate(reply)); return; } catch { /* fall through */ } }
    window.open(`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(reply)}`, "_blank");
  };

  return (
    <div className="stack">
      <Section title="Families">
        <Stats><Stat value={fams.length} label="Families" />{(Object.keys(LANGS) as Lang[]).map(l => <Stat key={l} value={fams.filter(f => f.lang === l).length} label={LANGS[l]} />)}</Stats>
      </Section>
      <div className="grid2">
        <Section title="Write a message">
          <div className="row" style={{ gap: 6 }}>{TPLS.map(t => <button key={t.id} className="btn small" aria-pressed={tid === t.id && !custom} style={tid === t.id && !custom ? { background: "var(--ink)", color: "var(--bg)" } : undefined} onClick={() => { setTid(t.id); setCustom(""); }}>{t.name}</button>)}</div>
          {!custom && <div className="row" style={{ marginTop: 12 }}>{tpl.fields.filter(f => f !== "child").map(f => <label key={f} className="field"><span>{FIELD_LABEL[f]}</span><input className="input" value={vals[f] ?? ""} onChange={e => setVals({ ...vals, [f]: e.target.value })} /></label>)}</div>}
          <label className="field" style={{ marginTop: 12 }}><span>Or write your own (in English)</span><textarea id="bn-c" className="input" rows={3} value={custom} onChange={e => { setCustom(e.target.value); setCustomOut({}); }} /></label>
          {custom && <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn small primary" style={{ alignSelf: "flex-start" }} onClick={translateCustom}>Translate for every family</button>
            {msg && <p className="note">{msg}</p>}
            {langs.filter(l => l !== "en").map(l => <div key={l} className="stack" style={{ gap: 4 }}><div className="row" style={{ justifyContent: "space-between" }}><span className="eyebrow">{LANGS[l]}</span><a className="btn ghost small" href={`https://translate.google.com/?sl=en&tl=${l}&text=${encodeURIComponent(custom)}`} target="_blank" rel="noreferrer">Google Translate</a></div><textarea className="input" rows={2} dir={l === "ar" ? "rtl" : "ltr"} aria-label={`${LANGS[l]} version`} value={customOut[l] ?? ""} onChange={e => setCustomOut({ ...customOut, [l]: e.target.value })} /></div>)}
          </div>}
          <label className="field" style={{ marginTop: 12 }}><span>Signed</span><input id="bn-t" className="input" value={teacher} onChange={e => setTeacher(e.target.value)} /></label>
        </Section>
        <Section title="Preview">
          {langs.map(l => { const f = fams.find(x => x.lang === l)!; return <div key={l} className="bn-prev" dir={l === "ar" ? "rtl" : "ltr"}><span className="eyebrow">{LANGS[l]} · {fams.filter(x => x.lang === l).length} {fams.filter(x => x.lang === l).length === 1 ? "family" : "families"}</span><p>{messageFor(f)}</p></div>; })}
        </Section>
      </div>
      <Section title="Send">
        {fams.map(f => (
          <div key={f.id} className="bn-row">
            <span style={{ flex: 1 }}><strong>{f.child}</strong> <span className="note">{f.parent} · {LANGS[f.lang]}</span></span>
            <a className="btn small primary" href={waLink(messageFor(f), f.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
            <button className="btn small" onClick={() => copy(messageFor(f))}>{copied ? "Copied" : "Copy"}</button>
          </div>
        ))}
        <p className="note" style={{ marginTop: 8 }}>Tip: for class groups, copy one message per language and post each in the right group.</p>
      </Section>
      <div className="grid2">
        <Section title="Translate a reply">
          <label className="field"><span>Paste a parent's reply in any language</span><textarea id="bn-r" className="input" rows={3} value={reply} onChange={e => setReply(e.target.value)} /></label>
          <button className="btn small" style={{ marginTop: 8 }} disabled={!reply.trim()} onClick={translateReply}>Translate to English</button>
          {replyOut && <p className="bn-prev" style={{ marginTop: 10 }}>{replyOut}</p>}
        </Section>
        <Section title="Add a family">
          <form className="stack" style={{ gap: 8 }} onSubmit={e => { e.preventDefault(); if (!nf.child.trim()) return; setFams([...fams, { ...nf, id: uid() }]); setNf({ id: "", child: "", parent: "", phone: "", lang: nf.lang }); }}>
            <div className="row"><input className="input" style={{ flex: 1 }} aria-label="Child" placeholder="Child" value={nf.child} onChange={e => setNf({ ...nf, child: e.target.value })} /><input className="input" style={{ flex: 1 }} aria-label="Parent" placeholder="Parent" value={nf.parent} onChange={e => setNf({ ...nf, parent: e.target.value })} /></div>
            <div className="row"><input className="input" style={{ flex: 1 }} aria-label="WhatsApp" placeholder="WhatsApp number" value={nf.phone} onChange={e => setNf({ ...nf, phone: e.target.value })} /><select className="input" style={{ flex: 1 }} aria-label="Language" value={nf.lang} onChange={e => setNf({ ...nf, lang: e.target.value as Lang })}>{(Object.keys(LANGS) as Lang[]).map(l => <option key={l} value={l}>{LANGS[l]}</option>)}</select><button className="btn small" type="submit">Add</button></div>
          </form>
          {fams.map(f => <div key={f.id} className="row note" style={{ justifyContent: "space-between", padding: "3px 0" }}><span>{f.child} · {LANGS[f.lang]}</span><button className="btn ghost small danger" onClick={() => setFams(fams.filter(x => x.id !== f.id))}>×</button></div>)}
        </Section>
      </div>
      <style>{`.bn-prev{padding:10px 12px;border-radius:8px;background:var(--sunk);margin-bottom:8px;white-space:pre-wrap}.bn-prev[dir=rtl]{font-size:17px}.bn-row{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}`}</style>
    </div>
  );
}
