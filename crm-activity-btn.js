/**
 * crm-activity-btn.js  — v3 (Persistent Widget Edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * Web Component para Webex Contact Center Agent Desktop.
 * Modo Persistent Widget: invisible cuando no hay interacción activa,
 * visible y funcional automáticamente al aceptar cualquier interacción.
 * Registra actividades en CollabMCR CRM (GitHub API).
 */

const CRM_REPO    = 'jlinero/collabmcr';
const CRM_DB_PATH = 'db/contacts.json';
const CRM_GH_API  = `https://api.github.com/repos/${CRM_REPO}/contents/${CRM_DB_PATH}`;
const LS_PAT_KEY  = 'crm_gh_pat_v1';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const TIPOS = [
  { key:'llamada',   label:'Llamada',   icon:'📞', color:'#00d4ff' },
  { key:'webchat',   label:'WebChat',   icon:'💬', color:'#00b8d9' },
  { key:'email',     label:'Email',     icon:'✉️',  color:'#818cf8' },
  { key:'whatsapp',  label:'WhatsApp',  icon:'💚', color:'#25d366' },
  { key:'messenger', label:'Messenger', icon:'💙', color:'#0078ff' },
  { key:'nota',      label:'Nota',      icon:'📝', color:'#ffaa00' },
  { key:'tarea',     label:'Tarea',     icon:'✅', color:'#00ffa3' },
  { key:'reunion',   label:'Reunión',   icon:'📅', color:'#ff3b6b' },
];
const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.key, t]));

const CHANNEL_MAP = {
  telephony:'llamada', chat:'webchat', email:'email',
  sms:'nota', facebook_messenger:'messenger',
  whatsapp:'whatsapp', social:'nota',
};

const STYLES = `
/* ── Invisible por defecto, aparece solo con interacción activa ── */
:host {
  display: none;           /* oculto sin interacción */
  height: 100%;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  background: #04080f; color: #dde6f5;
  overflow-y: auto;
}
:host(.active) {
  display: block;          /* visible al tener tarea activa */
}
:host::-webkit-scrollbar { width: 3px; }
:host::-webkit-scrollbar-thumb { background: #1a2d50; }

.state-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; min-height: 220px;
  gap: 10px; color: #4a6080; text-align: center; padding: 24px;
}
.state-empty .icon { font-size: 34px; opacity: .45; }
.state-empty p { font-size: 11px; line-height: 1.7; }

.contact-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; background: #070d1a;
  border-bottom: 1px solid #1a2d50;
}
.c-av {
  width: 40px; height: 40px; border-radius: 10px;
  background: linear-gradient(135deg,#1a56db,#00d4ff);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.c-av.unknown {
  background: #0d1628; border: 1px dashed #4a6080;
  font-size: 20px; color: #4a6080;
}
.c-info { flex: 1; min-width: 0; }
.c-name {
  font-weight: 700; font-size: 14px; color: #dde6f5;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.c-meta { font-size: 10px; color: #6b84a8; margin-top: 2px; }
.c-badge {
  font-size: 9px; font-weight: 700; letter-spacing: .05em;
  padding: 3px 8px; border-radius: 99px; border: 1px solid; flex-shrink: 0;
}
.c-badge.found   { border-color:#00d4ff44; background:#00d4ff0f; color:#00d4ff; }
.c-badge.unknown { border-color:#ffaa0044; background:#ffaa000f; color:#ffaa00; }

.ani-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 16px; background: #0a1020;
  border-bottom: 1px solid #1a2d50; font-size: 10px; color: #4a6080;
}
.ani-row .ani-val { color: #00d4ff; font-weight: 700; }
.channel-pill {
  margin-left: auto; font-size: 9px; padding: 2px 8px;
  border-radius: 99px; border: 1px solid; font-weight: 600;
}

.form-wrap { padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }
.f-label {
  display: block; font-size: 9px; color: #4a6080;
  letter-spacing: .08em; text-transform: uppercase; margin-bottom: 7px;
}

.tipo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; }
.tipo-btn {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; padding: 8px 3px; border-radius: 8px;
  background: #0d1628; border: 1px solid #1a2d50;
  cursor: pointer; transition: all .14s;
  font-family: inherit; font-size: 9px; color: #4a6080;
}
.tipo-btn:hover { border-color:#223660; color:#dde6f5; background:#111e35; }
.tipo-btn.sel {
  border-color: var(--tc,#00d4ff);
  background: color-mix(in srgb, var(--tc,#00d4ff) 12%, transparent);
  color: var(--tc,#00d4ff);
}
.tipo-icon { font-size: 16px; line-height: 1; }

textarea {
  width: 100%; background: #0d1628;
  border: 1px solid #1a2d50; border-radius: 9px;
  padding: 10px 12px; color: #dde6f5;
  font-family: inherit; font-size: 11px;
  outline: none; resize: none; line-height: 1.7;
  transition: border-color .2s;
}
textarea:focus { border-color:#00d4ff; box-shadow:0 0 0 2px rgba(0,212,255,.08); }
textarea::placeholder { color:#4a6080; }
textarea:disabled { opacity: .4; cursor: not-allowed; }

.btn-save {
  width: 100%; height: 40px;
  background: linear-gradient(135deg,#1a56db,#00d4ff);
  border: none; border-radius: 9px; color: #000;
  font-family: inherit; font-size: 12px; font-weight: 700;
  letter-spacing: .06em; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity .15s, transform .1s;
}
.btn-save:hover  { opacity:.88; }
.btn-save:active { transform:scale(.98); }
.btn-save:disabled { background:#1a2d50; color:#4a6080; cursor:not-allowed; transform:none; opacity:1; }

.divider { height:1px; background:#1a2d50; }

.recent-wrap { padding: 12px 16px 4px; }
.recent-title {
  font-size: 9px; color: #4a6080; letter-spacing: .08em;
  text-transform: uppercase; margin-bottom: 8px;
  display: flex; justify-content: space-between;
}
.recent-count { color:#6b84a8; }
.act-item {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 7px 0; border-bottom: 1px solid #0d1628;
}
.act-item:last-child { border-bottom:none; }
.act-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:4px; }
.act-body { flex:1; min-width:0; }
.act-desc-t {
  font-size:11px; color:#dde6f5; line-height:1.5;
  overflow:hidden; display:-webkit-box;
  -webkit-line-clamp:2; -webkit-box-orient:vertical;
}
.act-time-t { font-size:9px; color:#4a6080; margin-top:2px; }

.cfg-section { padding: 10px 16px 14px; background:#070d1a; border-top:1px solid #1a2d50; }
.cfg-title { font-size:9px; color:#4a6080; letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px; display:block; }
.pat-row { display:flex; gap:6px; }
.pat-row input {
  flex:1; background:#0d1628; border:1px solid #1a2d50; border-radius:7px;
  padding:7px 10px; color:#dde6f5; font-family:inherit; font-size:10px; outline:none;
  transition:border-color .2s;
}
.pat-row input:focus { border-color:#00d4ff; }
.pat-row input::placeholder { color:#4a6080; }
.btn-pat {
  padding:7px 12px; background:#00d4ff; border:none; border-radius:7px;
  color:#000; font-family:inherit; font-size:10px; font-weight:700;
  cursor:pointer; white-space:nowrap; transition:opacity .15s;
}
.btn-pat:hover { opacity:.85; }
.cfg-hint { font-size:9px; color:#4a6080; line-height:1.6; margin-top:6px; }

.spinner {
  width:13px; height:13px; border-radius:50%;
  border:2px solid #1a2d50; border-top-color:#00d4ff;
  animation:spin .55s linear infinite; flex-shrink:0;
}
@keyframes spin { to{transform:rotate(360deg)} }

.toast-wrap {
  position:sticky; bottom:0; left:0; right:0;
  display:flex; flex-direction:column; gap:4px;
  padding:0 16px 10px; pointer-events:none;
}
.toast {
  padding:7px 12px; border-radius:8px; font-size:11px;
  display:flex; align-items:center; gap:7px;
  pointer-events:auto; animation:fadeUp .2s ease;
}
.toast.ok   { background:#00ffa322; border:1px solid #00ffa3; color:#00ffa3; }
.toast.err  { background:#ff3b6b22; border:1px solid #ff3b6b; color:#ff3b6b; }
.toast.info { background:#00d4ff22; border:1px solid #00d4ff; color:#00d4ff; }
@keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
`;

class CrmActivityBtn extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._pat = ''; this._sha = ''; this._db = null;
    this._contact = null; this._ani = null; this._channel = null;
    this._agentName = ''; this._selectedTipo = 'llamada'; this._saving = false;
    this._injectStyles();
    this._toastWrap = document.createElement('div');
    this._toastWrap.className = 'toast-wrap';
    this.shadowRoot.appendChild(this._toastWrap);
    this._wrap = document.createElement('div');
    this._wrap.id = 'wrap';
    this.shadowRoot.insertBefore(this._wrap, this._toastWrap);
    this._loadPat();
    this._renderContent();
  }

  static get observedAttributes() { return ['interaction-data','agent-name']; }

  set interactionData(v) { this._handleTask(v); }
  set agentName(v)       { this._agentName = v || ''; }
  attributeChangedCallback(n,_,v) {
    if (n==='interaction-data') this._handleTask(v);
    if (n==='agent-name')       this._agentName = v||'';
  }

  _injectStyles() {
    const s = document.createElement('style');
    s.textContent = STYLES;
    this.shadowRoot.appendChild(s);
  }

  _handleTask(val) {
    let task = null;
    try { task = typeof val==='string' ? JSON.parse(val) : val; } catch(_) {}
    if (task && task.interactionId) {
      // ── Hay interacción activa → mostrar widget ──
      this.classList.add('active');
      const newAni = task.ani || (task.callAssociatedData||{}).ani || '';
      this._channel = task.channelType || task.mediaType || '';
      if (newAni !== this._ani) {
        this._ani = newAni; this._contact = null; this._sha = ''; this._db = null;
        this._renderContent();
        if (this._pat) this._lookupContact();
        else           this._renderContent();
      }
      const cKey = Object.keys(CHANNEL_MAP).find(k =>
        (this._channel||'').toLowerCase().includes(k));
      if (cKey) this._selectTipo(CHANNEL_MAP[cKey]);
    } else {
      // ── Sin interacción → ocultar widget completamente ──
      this.classList.remove('active');
      this._ani = null; this._contact = null; this._channel = null;
      this._renderContent();
    }
  }

  _renderContent() {
    if (!this._pat) { this._wrap.innerHTML = this._tplNoPat(); this._bindPat(); return; }
    // Sin ANI: el host ya está oculto (display:none via CSS), no hace falta renderizar
    if (!this._ani) { this._wrap.innerHTML = ''; return; }

    const recentActs = this._contact ? (this._contact.actividades||[]).slice(0,3) : [];
    const chColor = this._channelColor();
    const chLabel = this._channelLabel();

    this._wrap.innerHTML = `
      ${this._contact ? `
        <div class="contact-card">
          <div class="c-av">${this._initials(this._contact)}</div>
          <div class="c-info">
            <div class="c-name">${this._contact.nombre} ${this._contact.apellido}</div>
            <div class="c-meta">${[this._contact.cargo,this._contact.empresa].filter(Boolean).join(' · ')}</div>
          </div>
          <span class="c-badge found">✓ CRM</span>
        </div>` : `
        <div class="contact-card">
          <div class="c-av unknown">❓</div>
          <div class="c-info">
            <div class="c-name" style="color:#ffaa00">No encontrado en CRM</div>
            <div class="c-meta">${this._ani}</div>
          </div>
          <span class="c-badge unknown">Nuevo</span>
        </div>`}
      <div class="ani-row">
        ANI: <span class="ani-val">${this._ani||'—'}</span>
        <span class="channel-pill"
          style="border-color:${chColor}44;background:${chColor}11;color:${chColor}">
          ${chLabel}
        </span>
      </div>
      <div class="form-wrap">
        <div>
          <span class="f-label">Tipo de actividad</span>
          <div class="tipo-grid">
            ${TIPOS.map(t=>`
              <button class="tipo-btn${this._selectedTipo===t.key?' sel':''}"
                data-key="${t.key}" style="--tc:${t.color}">
                <span class="tipo-icon">${t.icon}</span>${t.label}
              </button>`).join('')}
          </div>
        </div>
        <div>
          <span class="f-label">Descripción</span>
          <textarea id="descInput" rows="4"
            placeholder="Describe el resultado de la interacción..."
            ${!this._contact?'disabled':''}></textarea>
        </div>
        <button class="btn-save" id="btnSave" ${!this._contact?'disabled':''}>
          <span id="saveIcon">⚡</span>
          <span id="saveText">GUARDAR EN CRM</span>
        </button>
      </div>
      ${recentActs.length ? `
        <div class="divider"></div>
        <div class="recent-wrap">
          <div class="recent-title">
            Últimas actividades
            <span class="recent-count">${(this._contact.actividades||[]).length} total</span>
          </div>
          ${recentActs.map(a => {
            const t = TIPO_MAP[a.tipo]||{color:'#4a6080'};
            return `<div class="act-item">
              <div class="act-dot" style="background:${t.color}"></div>
              <div class="act-body">
                <div class="act-desc-t">${a.descripcion||'—'}</div>
                <div class="act-time-t">${this._relTime(new Date(a.fecha))}${a.asignadoA?' · '+a.asignadoA:''}</div>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}
      <div class="divider"></div>
      <div class="cfg-section">
        <span class="cfg-title">⚙ GitHub PAT</span>
        <div class="pat-row">
          <input id="patInput" type="password" value="${this._pat}"
            placeholder="ghp_xxxxxxxxxxxx"/>
          <button class="btn-pat" id="btnSavePat">Guardar</button>
        </div>
        <div class="cfg-hint">GitHub → Settings → Developer settings → Personal access tokens (repo)</div>
      </div>`;

    this._bindFormEvents();
  }

  _tplEmpty() {
    return `<div class="state-empty">
      <div class="icon">⚡</div>
      <p>Acepta una interacción<br>para registrar actividades en el CRM.</p>
    </div>
    ${this._pat ? '' : this._tplCfgBar()}`;
  }

  _tplNoPat() {
    return `<div class="state-empty">
      <div class="icon">🔑</div>
      <p>Configura tu GitHub PAT<br>para conectar con el CRM.</p>
    </div>
    <div class="cfg-section">
      <span class="cfg-title">⚙ GitHub PAT</span>
      <div class="pat-row">
        <input id="patInput" type="password" placeholder="ghp_xxxxxxxxxxxx"/>
        <button class="btn-pat" id="btnSavePat">Guardar</button>
      </div>
      <div class="cfg-hint">GitHub → Settings → Developer settings → Personal access tokens (repo)</div>
    </div>`;
  }

  _tplCfgBar() { return ''; }

  _bindPat() {
    const btn = this.shadowRoot.getElementById('btnSavePat');
    if (btn) btn.addEventListener('click', () => this._savePat());
  }

  _bindFormEvents() {
    this._wrap.querySelectorAll('.tipo-btn').forEach(b =>
      b.addEventListener('click', () => this._selectTipo(b.dataset.key)));
    const save = this.shadowRoot.getElementById('btnSave');
    if (save) save.addEventListener('click', () => this._save());
    const pat = this.shadowRoot.getElementById('btnSavePat');
    if (pat)  pat.addEventListener('click', () => this._savePat());
  }

  _selectTipo(key) {
    if (!TIPO_MAP[key]) return;
    this._selectedTipo = key;
    this._wrap.querySelectorAll('.tipo-btn').forEach(b =>
      b.classList.toggle('sel', b.dataset.key===key));
  }

  _loadPat() {
    try { const v=localStorage.getItem(LS_PAT_KEY); if(v) this._pat=v; } catch(_){}
  }

  _savePat() {
    const inp = this.shadowRoot.getElementById('patInput');
    const v = inp ? inp.value.trim() : '';
    if (!v) { this._toast('El PAT no puede estar vacío','err'); return; }
    this._pat = v;
    try { localStorage.setItem(LS_PAT_KEY,v); } catch(_){}
    this._toast('PAT guardado ✓','ok');
    if (this._ani) { this._contact=null; this._renderContent(); this._lookupContact(); }
    else this._renderContent();
  }

  async _lookupContact() {
    const card = this._wrap.querySelector('.contact-card');
    if (card) card.innerHTML = `<div class="spinner"></div>
      <div class="c-info" style="color:#6b84a8;font-size:11px;">Buscando contacto…</div>`;
    try {
      const db = await this._ghGet();
      this._db = db;
      const tel = (this._ani||'').replace(/[\s\-\(\)]/g,'');
      const hit = (db.contacts||[]).find(c => {
        const t1=(c.telefono||'').replace(/[\s\-\(\)]/g,'');
        const t2=(c.telEmpresa||'').replace(/[\s\-\(\)]/g,'');
        return t1===tel||t2===tel||t1.endsWith(tel)||tel.endsWith(t1);
      });
      this._contact = hit||null;
      this._renderContent();
      if (!hit) this._toast('Número no encontrado en el CRM','info');
    } catch(e) { this._toast('Error: '+e.message,'err'); }
  }

  async _save() {
    if (!this._contact) { this._toast('Contacto no identificado','err'); return; }
    const inp  = this.shadowRoot.getElementById('descInput');
    const desc = inp ? inp.value.trim() : '';
    if (!desc) { this._toast('Escribe una descripción','err'); return; }
    if (this._saving) return;
    this._saving = true;
    const btn  = this.shadowRoot.getElementById('btnSave');
    const icon = this.shadowRoot.getElementById('saveIcon');
    const text = this.shadowRoot.getElementById('saveText');
    if (btn) btn.disabled=true;
    if (icon) icon.textContent='⏳';
    if (text) text.textContent='GUARDANDO…';
    try {
      const fresh = await this._ghGet();
      this._db = fresh;
      const idx = this._db.contacts.findIndex(c=>c.id===this._contact.id);
      if (idx<0) throw new Error('Contacto no encontrado en la DB');
      const act = {
        id:uid(), tipo:this._selectedTipo, descripcion:desc,
        asignadoA:this._agentName||'Agente WxCC',
        fecha:new Date().toISOString()
      };
      if (!this._db.contacts[idx].actividades) this._db.contacts[idx].actividades=[];
      this._db.contacts[idx].actividades.unshift(act);
      this._db.contacts[idx].actualizadoEn = act.fecha;
      this._contact = this._db.contacts[idx];
      await this._ghPut(this._db,
        `WxCC: ${this._selectedTipo} — ${this._contact.nombre} ${this._contact.apellido}`);
      this._toast(`✓ Actividad registrada para ${this._contact.nombre}`,'ok');
      if (inp) inp.value='';
      setTimeout(()=>this._renderContent(), 400);
    } catch(e) { this._toast('Error: '+e.message,'err'); }
    finally {
      this._saving=false;
      if (btn) btn.disabled=false;
      if (icon) icon.textContent='⚡';
      if (text) text.textContent='GUARDAR EN CRM';
    }
  }

  async _ghGet() {
    const r = await fetch(CRM_GH_API,{
      headers:{'Authorization':'token '+this._pat,'Accept':'application/vnd.github.v3+json'}});
    if (r.status===404) return {contacts:[]};
    if (!r.ok) throw new Error('GitHub '+r.status+': '+r.statusText);
    const data=await r.json();
    this._sha=data.sha;
    return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g,'')))));
  }

  async _ghPut(content,message) {
    const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(content,null,2))));
    const body={message:message||'WxCC CRM update',content:encoded};
    if (this._sha) body.sha=this._sha;
    const r=await fetch(CRM_GH_API,{method:'PUT',
      headers:{'Authorization':'token '+this._pat,'Content-Type':'application/json',
               'Accept':'application/vnd.github.v3+json'},
      body:JSON.stringify(body)});
    if (!r.ok){const e=await r.json();throw new Error(e.message||'GitHub PUT '+r.status);}
    const data=await r.json(); this._sha=data.content.sha;
  }

  _initials(c) { return ((c.nombre||'?')[0]+(c.apellido||'?')[0]).toUpperCase(); }

  _channelLabel() {
    const c=(this._channel||'').toLowerCase();
    if (c.includes('telephony')) return '📞 Voz';
    if (c.includes('chat'))      return '💬 Chat';
    if (c.includes('email'))     return '✉️ Email';
    if (c.includes('whatsapp'))  return '💚 WhatsApp';
    if (c.includes('messenger')) return '💙 Messenger';
    if (c.includes('sms'))       return '📱 SMS';
    return this._channel||'Interacción';
  }

  _channelColor() {
    const c=(this._channel||'').toLowerCase();
    if (c.includes('telephony')) return '#00d4ff';
    if (c.includes('chat'))      return '#00b8d9';
    if (c.includes('email'))     return '#818cf8';
    if (c.includes('whatsapp'))  return '#25d366';
    if (c.includes('messenger')) return '#0078ff';
    return '#6b84a8';
  }

  _relTime(d) {
    const diff=Date.now()-d.getTime(), m=Math.floor(diff/60000);
    if (m<1)  return 'ahora';
    if (m<60) return m+'m';
    const h=Math.floor(m/60);
    if (h<24) return h+'h';
    return Math.floor(h/24)+'d';
  }

  _toast(msg,type='info',dur=3500) {
    const el=document.createElement('div');
    el.className='toast '+type; el.textContent=msg;
    this._toastWrap.appendChild(el);
    setTimeout(()=>{
      el.style.transition='all .3s'; el.style.opacity='0';
      el.style.transform='translateY(4px)';
      setTimeout(()=>el.remove(),320);
    },dur);
  }
}

if (!customElements.get('crm-activity-btn')) {
  customElements.define('crm-activity-btn', CrmActivityBtn);
}
