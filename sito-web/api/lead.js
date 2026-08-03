// Serverless function (Vercel Node runtime) — riceve i dati dei form del sito
// e li inoltra via email ad Andrea con Resend. Nessuna dipendenza esterna:
// usa fetch globale (Node 18+) e legge i segreti dalle env var di Vercel.
//
// Env richieste (impostate su Vercel, NON in git):
//   RESEND_API_KEY  -> chiave Resend dedicata "andreapiani-sito-lead"
//   LEAD_TO         -> destinatario (default andreapiani.dev@gmail.com)
//   LEAD_FROM       -> mittente verificato (default onboarding@resend.dev)

const FIELD_LABELS = {
  tipo_app: 'Tipo progetto', tipo: 'Tipo', budget: 'Budget',
  tempistiche: 'Tempistiche', tempi: 'Tempistiche', settore: 'Settore',
  nome: 'Nome e cognome', name: 'Nome', azienda: 'Azienda',
  email: 'Email', telefono: 'Telefono', tel: 'Telefono', phone: 'Telefono',
  messaggio: 'Messaggio', message: 'Messaggio', descrizione: 'Descrizione',
  note: 'Note', url: 'URL', sito: 'Sito', shop: 'Shop', citta: 'Città',
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function labelFor(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function readBody(req) {
  // Vercel di solito popola req.body; se manca, leggiamo lo stream.
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

export default async function handler(req, res) {
  // CORS: stesso dominio in produzione, ma teniamo margine per www/apex
  const origin = req.headers.origin || '';
  if (/^https:\/\/(www\.)?andreapiani\.com$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  let data;
  try { data = await readBody(req); }
  catch { return res.status(400).json({ ok: false, error: 'body' }); }

  // Honeypot: i bot compilano campi nascosti. Se pieno, fingiamo successo.
  if (data._gotcha || data.website_url || data.company_hp) {
    return res.status(200).json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'config' });

  const to = process.env.LEAD_TO || 'andreapiani.dev@gmail.com';
  const from = process.env.LEAD_FROM || 'Lead Sito <onboarding@resend.dev>';

  const page = String(data._page || data._form || 'sito').slice(0, 120);
  const email = String(data.email || data.mail || '').trim().slice(0, 200);
  const nome = String(data.nome || data.name || '').trim().slice(0, 120);

  // Costruisci righe dai campi utili (salta interni _*, honeypot, vuoti)
  const rows = [];
  for (const [k, vRaw] of Object.entries(data)) {
    if (k.startsWith('_') || ['website_url', 'company_hp'].includes(k)) continue;
    const v = Array.isArray(vRaw) ? vRaw.join(', ') : String(vRaw == null ? '' : vRaw).trim();
    if (!v) continue;
    rows.push([labelFor(k), v.slice(0, 2000)]);
  }
  if (!rows.length) return res.status(400).json({ ok: false, error: 'empty' });

  const subjectWho = nome || email || 'anonimo';
  const subject = `Nuovo lead dal sito — ${subjectWho} (${page})`;

  const textLines = rows.map(([l, v]) => `${l}: ${v}`);
  textLines.push('', `Pagina: ${page}`);
  const text = `Nuova richiesta dal sito andreapiani.com\n\n${textLines.join('\n')}`;

  const htmlRows = rows.map(
    ([l, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top">${esc(l)}</td><td style="padding:6px 0;color:#111"><strong>${esc(v)}</strong></td></tr>`
  ).join('');
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px">
    <h2 style="margin:0 0 4px">Nuovo lead dal sito</h2>
    <p style="margin:0 0 16px;color:#888;font-size:13px">Pagina: ${esc(page)}</p>
    <table style="border-collapse:collapse;font-size:15px">${htmlRows}</table>
  </div>`;

  const payload = {
    from,
    to: [to],
    subject,
    text,
    html,
  };
  // Reply-To = email del cliente: rispondi e scrivi direttamente a lui
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) payload.reply_to = email;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ ok: false, error: 'send', detail: detail.slice(0, 200) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'network' });
  }
}
