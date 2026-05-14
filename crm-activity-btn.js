/**
 * crm-activity-btn.js
 * Web Component para Webex Contact Center Agent Desktop
 * Registra actividades en CollabMCR CRM (GitHub API) durante interacciones activas.
 *
 * Uso en layout.json:
 * {
 *   "comp": "crm-activity-btn",
 *   "script": "https://jlinero.github.io/collabmcr/crm-activity-btn.js",
 *   "properties": {
 *     "taskSelected": "$STORE.agentContact.taskSelected",
 *     "agentName":    "$STORE.agent.agentName"
 *   }
 * }
 */

const CRM_REPO    = 'jlinero/collabmcr';
const CRM_DB_PATH = 'db/contacts.json';
const CRM_GH_API  = `https://api.github.com/repos/${CRM_REPO}/contents/${CRM_DB_PATH}`;
const LS_PAT      = 'crm_gh_pat_v1';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const TIPOS = [
  { key: 'llamada',   label: 'Llamada',   icon: '📞', color: '#00d4ff' },
  { key: 'webchat',   label: 'WebChat',   icon: '💬', color: '#00b8d9' },
  { key: 'email',     label: 'Email',     icon: '✉️',  color: '#818cf8' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💚', color: '#25d366' },
  { key: 'messenger', label: 'Messenger', icon: '💙', color: '#0078ff' },
  { key: 'nota',      label: 'Nota',      icon: '📝', color: '#ffaa00' },
  { key: 'tarea',     label: 'Tarea',     icon: '✅', color: '#00ffa3' },
  { key: 'reunion',   label: 'Reunión',   icon: '📅', color: '#ff3b6b' },
];

const TIPO_MAP = {};
TIPOS.forEach(t => TIPO_MAP[t.key] = t);

// ─────────────────────────────────────────────
//  Template HTML interno
// ─────────────────────────────────────────────
const TEMPLATE = `
<style>
  :host { display: inline-flex; align-items: center; }

  /* ── Botón principal ── */
  #trigger {
    display: none; /* oculto hasta que haya tarea activa */
    align-items: center; gap: 6px;
    background: linear-gradient(135deg, #1a56db, #00d4ff);
    border: none; border-radius: 8px;
    padding: 0 14px; height: 36px;
    color: #fff; font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 11px; font-weight: 700; letter-spacing: .05em;
    cursor: pointer; white-space: nowrap;
    box-shadow: 0 2px 12px rgba(0,212,255,.30);
    transition: opacity .15s, transform .1s, box-shadow .2s;
    user-select: none;
  }
  #trigger:hover  { opacity: .88; box-shadow: 0 4px 20px rgba(0,212,255,.50); }
  #trigger:active { transform: scale(.96); }
  #trigger.active { display: inline-flex; }

  .btn-icon { font-size: 14px; }
  .btn-dot  {
    width: 7px; height: 7px; border-radius: 50%;
    background: #00ffa3;
    box-shadow: 0 0 6px #00ffa3;
    flex-shrink: 0;
  }

  /* ── Panel flotante ── */
  #panel {
    display: none;
    position: fixed; z-index: 99999;
    top: 68px; right: 16px;
    width: 320px;
    background: #070d1a;
    border: 1px solid #223660;
    border-radius: 14px;
    box-shadow: 0 24px 64px rgba(0,0,0,.7), 0 0 0 1px rgba(0,212,255,.08);
    flex-direction: column;
    overflow: hidden;
    animation: slideDown .18s ease;
  }
  #panel.open { display: flex; }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Panel header */
  .p-head {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid #1a2d50;
    background: #0a1020;
  }
  .p-icon {
    width: 30px; height: 30px; border-radius: 8px;
    background: linear-gradient(135deg,#1a56db22,#00d4ff33);
    border: 1px solid #00d4ff;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
  }
  .p-title {
    flex: 1; min-width: 0;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    font-weight: 700; color: #00d4ff; letter-spacing: .08em;
    text-transform: uppercase;
  }
  .p-close {
    width: 24px; height: 24px; border-radius: 6px;
    background: transparent; border: none;
    color: #4a6080; font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: color .15s, background .15s;
  }
  .p-close:hover { color: #dde6f5; background: #1a2d50; }

  /* Contacto */
  .contact-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-bottom: 1px solid #1a2d50;
    min-height: 52px;
  }
  .c-avatar {
    width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
    background: linear-gradient(135deg, #1a56db, #00d4ff);
    display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; font-weight: 700; color: #fff;
  }
  .c-avatar.empty {
    background: #0d1628; border: 1px dashed #4a6080;
    font-size: 16px; color: #4a6080;
  }
  .c-info { flex: 1; min-width: 0; }
  .c-name {
    font-weight: 700; font-size: 13px; color: #dde6f5;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .c-meta {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: #6b84a8; margin-top: 1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .c-ani {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: #00d4ff; flex-shrink: 0;
  }
  .c-loading {
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: #4a6080; display: flex; align-items: center; gap: 7px;
  }
  .spinner {
    width: 12px; height: 12px;
    border: 2px solid #1a2d50; border-top-color: #00d4ff;
    border-radius: 50%; animation: spin .6s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Form body */
  .p-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }

  .f-label {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    color: #4a6080; letter-spacing: .08em; text-transform: uppercase;
    display: block; margin-bottom: 5px;
  }

  /* Tipo grid */
  .tipo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 4px; }
  .tipo-btn {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3px;
    padding: 6px 2px; border-radius: 7px;
    background: #0d1628; border: 1px solid #1a2d50;
    cursor: pointer; transition: all .14s;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; color: #4a6080;
  }
  .tipo-btn:hover { border-color: #223660; color: #dde6f5; }
  .tipo-btn.active {
    border-color: var(--tc, #00d4ff);
    background: color-mix(in srgb, var(--tc, #00d4ff) 10%, transparent);
    color: var(--tc, #00d4ff);
  }
  .tipo-btn .t-ic { font-size: 15px; }

  /* Textarea */
  textarea {
    width: 100%; background: #0d1628;
    border: 1px solid #1a2d50; border-radius: 8px;
    padding: 8px 10px; color: #dde6f5;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    outline: none; resize: none; line-height: 1.6;
    transition: border-color .2s;
  }
  textarea:focus { border-color: #00d4ff; }
  textarea::placeholder { color: #4a6080; }

  /* PAT input */
  .pat-row { display: flex; gap: 6px; }
  .pat-row input {
    flex: 1; background: #0d1628;
    border: 1px solid #1a2d50; border-radius: 8px;
    padding: 7px 10px; color: #dde6f5;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    outline: none; transition: border-color .2s;
  }
  .pat-row input:focus { border-color: #00d4ff; }
  .pat-row input::placeholder { color: #4a6080; }

  /* Footer */
  .p-footer {
    padding: 0 14px 12px;
    display: flex; gap: 6px;
  }
  .btn-save {
    flex: 1; height: 36px;
    background: linear-gradient(135deg, #1a56db, #00d4ff);
    border: none; border-radius: 8px;
    color: #000; font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 700; letter-spacing: .05em;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; gap: 6px;
    transition: opacity .15s, transform .1s;
  }
  .btn-save:hover   { opacity: .88; }
  .btn-save:active  { transform: scale(.97); }
  .btn-save:disabled { background: #1a2d50; color: #4a6080; cursor: not-allowed; }

  .btn-cfg {
    width: 36px; height: 36px;
    background: #0d1628; border: 1px solid #1a2d50;
    border-radius: 8px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; transition: border-color .15s;
  }
  .btn-cfg:hover { border-color: #00d4ff; }

  /* Config panel */
  #cfg-panel {
    display: none;
    background: #0a1020; border-top: 1px solid #1a2d50;
    padding: 10px 14px 12px; flex-direction: column; gap: 8px;
  }
  #cfg-panel.open { display: flex; }
  .cfg-title {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    color: #4a6080; letter-spacing: .08em; text-transform: uppercase;
  }
  .btn-save-cfg {
    height: 30px; background: #00d4ff;
    border: none; border-radius: 7px;
    color: #000; font-family: 'JetBrains Mono', monospace;
    font-size: 10px; font-weight: 700; cursor: pointer;
    transition: opacity .15s;
  }
  .btn-save-cfg:hover { opacity: .85; }

  /* Toast interno */
  .toast-wrap {
    position: fixed; bottom: 14px; right: 14px;
    display: flex; flex-direction: column; gap: 5px; z-index: 100000;
    pointer-events: none;
  }
  .toast {
    padding: 7px 12px; border-radius: 8px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    display: flex; align-items: center; gap: 7px;
    pointer-events: auto;
  }
  .toast.ok   { background: #00ffa322; border: 1px solid #00ffa3; color: #00ffa3; }
  .toast.err  { background: #ff3b6b22; border: 1px solid #ff3b6b; color: #ff3b6b; }
  .toast.info { background: #00d4ff22; border: 1px solid #00d4ff; color: #00d4ff; }
</style>

<!-- Botón principal del header -->
<button id="trigger" title="Registrar actividad en CRM">
  <span class="btn-icon">⚡</span>
  <span>CRM</span>
  <span class="btn-dot"></span>
</button>

<!-- Panel flotante -->
<div id="panel">

  <!-- Cabecera del panel -->
  <div class="p-head">
    <div class="p-icon">⚡</div>
    <div class="p-title">Registrar actividad · CRM</div>
    <button class="p-close" id="btnClose">✕</button>
  </div>

  <!-- Contacto identificado -->
  <div class="contact-row" id="contactRow">
    <div class="c-loading">
      <div class="spinner"></div>
      Buscando contacto...
    </div>
  </div>

  <!-- Formulario -->
  <div class="p-body">
    <div>
      <span class="f-label">Tipo de actividad</span>
      <div class="tipo-grid" id="tipoGrid"></div>
    </div>
    <div>
      <span class="f-label">Descripción</span>
      <textarea id="descInput" rows="3"
        placeholder="Describe el resultado de la interacción..."></textarea>
    </div>
  </div>

  <!-- Config PAT (oculto por defecto) -->
  <div id="cfg-panel">
    <span class="cfg-title">⚙ GitHub Personal Access Token</span>
    <div class="pat-row">
      <input id="patInput" type="password" placeholder="ghp_xxxxxxxxxxxx"/>
    </div>
    <button class="btn-save-cfg" id="btnSavePat">Guardar PAT</button>
  </div>

  <!-- Footer -->
  <div class="p-footer">
    <button class="btn-cfg" id="btnCfg" title="Configurar PAT">⚙</button>
    <button class="btn-save" id="btnSave" disabled>
      <span id="saveIcon">⚡</span>
      <span id="saveText">GUARDAR EN CRM</span>
    </button>
  </div>
</div>

<!-- Toasts -->
<div class="toast-wrap" id="toastWrap"></div>
`;

// ─────────────────────────────────────────────
//  Web Component
// ─────────────────────────────────────────────
class CrmActivityBtn extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;

    // Estado interno
    this._pat          = '';
    this._sha          = '';
    this._db           = null;
    this._contact      = null;
    this._ani          = null;
    this._agentName    = '';
    this._selectedTipo = 'llamada';
    this._panelOpen    = false;
    this._saving       = false;

    this._buildTipoGrid();
    this._bindEvents();
    this._loadPat();
  }

  // ── Propiedades observadas desde $STORE ──────────────
  static get observedAttributes() {
    return ['task-selected', 'agent-name'];
  }

  // WxCC pasa $STORE variables como "properties" (no attributes)
  // Soportamos ambas formas por compatibilidad
  set taskSelected(val) {
    this._onTaskChange(val);
  }
  get taskSelected() { return this._taskSelected; }

  set agentName(val) {
    this._agentName = val || '';
  }
  get agentName() { return this._agentName; }

  attributeChangedCallback(name, _, newVal) {
    if (name === 'task-selected') this._onTaskChange(newVal);
    if (name === 'agent-name')    this._agentName = newVal || '';
  }

  // ── Reacción al cambio de tarea activa ───────────────
  _onTaskChange(val) {
    this._taskSelected = val;
    const trigger = this.shadowRoot.getElementById('trigger');

    let task = null;
    try {
      task = typeof val === 'string' ? JSON.parse(val) : val;
    } catch (_) {}

    const hasTask = task && task.interactionId;

    if (hasTask) {
      trigger.classList.add('active');
      // Extraer ANI del task
      const newAni = task.ani || task.callAssociatedData?.ani || '';
      if (newAni !== this._ani) {
        this._ani     = newAni;
        this._contact = null;
        this._sha     = '';
        this._db      = null;
        // Auto-buscar contacto si el panel ya está abierto
        if (this._panelOpen) this._lookupContact();
      }
      // Detectar canal automáticamente y pre-seleccionar tipo
      const channel = task.channelType || task.mediaType || '';
      const autoTipo = this._channelToTipo(channel);
      this._selectTipo(autoTipo);
    } else {
      trigger.classList.remove('active');
      this._closePanel();
      this._contact = null;
      this._ani     = null;
    }
  }

  _channelToTipo(channel) {
    const map = {
      'telephony': 'llamada', 'chat': 'webchat',
      'email': 'email', 'sms': 'nota',
      'facebook_messenger': 'messenger',
      'whatsapp': 'whatsapp', 'social': 'nota',
    };
    const c = (channel || '').toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (c.includes(k)) return v;
    }
    return 'llamada';
  }

  // ── Construir grid de tipos ──────────────────────────
  _buildTipoGrid() {
    const grid = this.shadowRoot.getElementById('tipoGrid');
    TIPOS.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'tipo-btn' + (t.key === 'llamada' ? ' active' : '');
      btn.dataset.key = t.key;
      btn.style.setProperty('--tc', t.color);
      btn.innerHTML = `<span class="t-ic">${t.icon}</span>${t.label}`;
      btn.addEventListener('click', () => this._selectTipo(t.key));
      grid.appendChild(btn);
    });
  }

  _selectTipo(key) {
    this._selectedTipo = key;
    const btns = this.shadowRoot.querySelectorAll('.tipo-btn');
    btns.forEach(b => {
      b.classList.toggle('active', b.dataset.key === key);
      const t = TIPO_MAP[b.dataset.key];
      if (t) b.style.setProperty('--tc', t.color);
    });
  }

  // ── Eventos UI ───────────────────────────────────────
  _bindEvents() {
    const $ = id => this.shadowRoot.getElementById(id);

    $('trigger').addEventListener('click', () => this._togglePanel());
    $('btnClose').addEventListener('click', () => this._closePanel());
    $('btnSave').addEventListener('click', () => this._save());
    $('btnCfg').addEventListener('click', () => this._toggleCfg());
    $('btnSavePat').addEventListener('click', () => this._savePat());

    // Cerrar al hacer click fuera
    document.addEventListener('click', e => {
      if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
        this._closePanel();
      }
    });
  }

  _togglePanel() {
    this._panelOpen ? this._closePanel() : this._openPanel();
  }

  _openPanel() {
    this._panelOpen = true;
    this.shadowRoot.getElementById('panel').classList.add('open');
    if (this._ani && !this._contact) this._lookupContact();
    else if (this._contact) this._renderContact(this._contact);
    else this._renderNoContact();
  }

  _closePanel() {
    this._panelOpen = false;
    this.shadowRoot.getElementById('panel').classList.remove('open');
    this.shadowRoot.getElementById('cfg-panel').classList.remove('open');
  }

  _toggleCfg() {
    this.shadowRoot.getElementById('cfg-panel').classList.toggle('open');
  }

  // ── PAT ──────────────────────────────────────────────
  _loadPat() {
    try {
      const stored = localStorage.getItem(LS_PAT);
      if (stored) {
        this._pat = stored;
        this.shadowRoot.getElementById('patInput').value = stored;
      }
    } catch (_) {}
  }

  _savePat() {
    const val = this.shadowRoot.getElementById('patInput').value.trim();
    if (!val) { this._toast('El PAT no puede estar vacío', 'err'); return; }
    this._pat = val;
    try { localStorage.setItem(LS_PAT, val); } catch (_) {}
    this.shadowRoot.getElementById('cfg-panel').classList.remove('open');
    this._toast('PAT guardado ✓', 'ok');
    // Re-buscar contacto si hay ANI pendiente
    if (this._ani) { this._contact = null; this._lookupContact(); }
  }

  // ── Buscar contacto por ANI ──────────────────────────
  async _lookupContact() {
    if (!this._pat) {
      this._renderNoPat();
      return;
    }
    this._renderLoading('Buscando contacto...');
    try {
      const db = await this._ghGet();
      this._db = db;
      const tel = (this._ani || '').replace(/[\s\-\(\)]/g, '');
      const found = (db.contacts || []).find(c => {
        const t1 = (c.telefono   || '').replace(/[\s\-\(\)]/g, '');
        const t2 = (c.telEmpresa || '').replace(/[\s\-\(\)]/g, '');
        return t1 === tel || t2 === tel ||
               t1.endsWith(tel) || tel.endsWith(t1);
      });
      if (found) {
        this._contact = found;
        this._renderContact(found);
        this.shadowRoot.getElementById('btnSave').disabled = false;
      } else {
        this._contact = null;
        this._renderNoContact();
        this.shadowRoot.getElementById('btnSave').disabled = true;
      }
    } catch (e) {
      this._renderError(e.message);
    }
  }

  // ── Render estados del contacto ──────────────────────
  _renderLoading(msg) {
    this.shadowRoot.getElementById('contactRow').innerHTML = `
      <div class="c-loading"><div class="spinner"></div>${msg}</div>`;
  }

  _renderContact(c) {
    const initials = ((c.nombre || '?')[0] + (c.apellido || '?')[0]).toUpperCase();
    this.shadowRoot.getElementById('contactRow').innerHTML = `
      <div class="c-avatar">${initials}</div>
      <div class="c-info">
        <div class="c-name">${c.nombre} ${c.apellido}</div>
        <div class="c-meta">${[c.cargo, c.empresa].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="c-ani">${this._ani || ''}</div>`;
  }

  _renderNoContact() {
    this.shadowRoot.getElementById('contactRow').innerHTML = `
      <div class="c-avatar empty">❓</div>
      <div class="c-info">
        <div class="c-name" style="color:#ffaa00">No encontrado</div>
        <div class="c-meta">${this._ani || 'Sin número'}</div>
      </div>`;
  }

  _renderNoPat() {
    this.shadowRoot.getElementById('contactRow').innerHTML = `
      <div class="c-loading" style="color:#ffaa00">
        ⚠ Configura el GitHub PAT (⚙)
      </div>`;
    this.shadowRoot.getElementById('cfg-panel').classList.add('open');
  }

  _renderError(msg) {
    this.shadowRoot.getElementById('contactRow').innerHTML = `
      <div class="c-loading" style="color:#ff3b6b">
        ✕ ${msg}
      </div>`;
  }

  // ── Guardar actividad ────────────────────────────────
  async _save() {
    if (!this._contact) { this._toast('Contacto no encontrado en CRM', 'err'); return; }
    const desc = this.shadowRoot.getElementById('descInput').value.trim();
    if (!desc) { this._toast('Escribe una descripción', 'err'); return; }
    if (this._saving) return;

    this._saving = true;
    const btn = this.shadowRoot.getElementById('btnSave');
    btn.disabled = true;
    this.shadowRoot.getElementById('saveIcon').textContent = '⏳';
    this.shadowRoot.getElementById('saveText').textContent = 'GUARDANDO...';

    try {
      // Refrescar SHA antes de escribir (evitar conflictos)
      const freshDb = await this._ghGet();
      this._db = freshDb;

      const idx = this._db.contacts.findIndex(c => c.id === this._contact.id);
      if (idx < 0) throw new Error('Contacto no encontrado en la DB');

      const newActivity = {
        id:          uid(),
        tipo:        this._selectedTipo,
        descripcion: desc,
        asignadoA:   this._agentName || 'Agente WxCC',
        fecha:       new Date().toISOString(),
      };

      if (!this._db.contacts[idx].actividades) this._db.contacts[idx].actividades = [];
      this._db.contacts[idx].actividades.unshift(newActivity);
      this._db.contacts[idx].actualizadoEn = newActivity.fecha;

      await this._ghPut(
        this._db,
        `WxCC: ${this._selectedTipo} — ${this._contact.nombre} ${this._contact.apellido}`
      );

      this._toast(`✓ Actividad registrada para ${this._contact.nombre}`, 'ok');
      this.shadowRoot.getElementById('descInput').value = '';
      this._closePanel();

    } catch (e) {
      this._toast('Error: ' + e.message, 'err');
    } finally {
      this._saving = false;
      btn.disabled = false;
      this.shadowRoot.getElementById('saveIcon').textContent = '⚡';
      this.shadowRoot.getElementById('saveText').textContent = 'GUARDAR EN CRM';
    }
  }

  // ── GitHub API ───────────────────────────────────────
  async _ghGet() {
    const r = await fetch(CRM_GH_API, {
      headers: { 'Authorization': 'token ' + this._pat, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (r.status === 404) return { contacts: [] };
    if (!r.ok) throw new Error('GitHub ' + r.status + ': ' + r.statusText);
    const data = await r.json();
    this._sha = data.sha;
    return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))));
  }

  async _ghPut(content, message) {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
    const body = { message: message || 'WxCC CRM update', content: encoded };
    if (this._sha) body.sha = this._sha;
    const r = await fetch(CRM_GH_API, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + this._pat,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'GitHub PUT ' + r.status); }
    const data = await r.json();
    this._sha = data.content.sha;
  }

  // ── Toast ────────────────────────────────────────────
  _toast(msg, type = 'info', dur = 3500) {
    const wrap = this.shadowRoot.getElementById('toastWrap');
    const el   = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'all .3s';
      el.style.opacity    = '0';
      el.style.transform  = 'translateX(10px)';
      setTimeout(() => el.remove(), 320);
    }, dur);
  }
}

// ─────────────────────────────────────────────
//  Registro del componente
// ─────────────────────────────────────────────
if (!customElements.get('crm-activity-btn')) {
  customElements.define('crm-activity-btn', CrmActivityBtn);
}
