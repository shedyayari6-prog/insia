/*
 * INSIA website chat widget.
 *
 * Install with ONE script tag (the dashboard generates it for you):
 *   <script src="https://YOUR-APP/insia-widget.js" data-key="wk_..." data-api="https://xxxx.supabase.co/functions/v1" async></script>
 *
 * - No dependencies, no cookies. Renders inside a Shadow DOM so the host page's CSS cannot affect it.
 * - Only the public widget key is used. No secret ever reaches the browser.
 * - All text is inserted with textContent (never innerHTML), so message content cannot inject markup.
 * - The same file powers the live preview in the INSIA dashboard (window.InsiaWidget.preview).
 */
(function () {
  'use strict';
  if (window.InsiaWidget) return;

  var STR = {
    en: {
      open: 'Open chat', close: 'Close chat', menu: 'Chat options', placeholder: 'Type your message…', send: 'Send',
      typing: 'Typing', newConv: 'Start a new conversation', contact: 'Share contact details (optional)',
      name: 'Name', email: 'Email', phone: 'Phone', save: 'Save', cancel: 'Cancel',
      thanks: 'Thank you! Your details were saved.', welcome: 'Hello! I am the assistant of {name}. How can I help you?',
      errGeneric: 'Sorry, something went wrong. Please try again.', errRate: 'You are sending messages too quickly. Please wait a moment.',
      errNet: 'Could not reach the chat. Check your connection and try again.', preview: 'Preview: messages are not sent.',
      powered: 'Powered by INSIA', contactFirst: 'Send a message first, then you can share your details.',
      contactIntro: 'Only share what you are comfortable with. Every field is optional.', starters: 'Suggested questions'
    },
    fr: {
      open: 'Ouvrir le chat', close: 'Fermer le chat', menu: 'Options du chat', placeholder: 'Écrivez votre message…', send: 'Envoyer',
      typing: 'En train d’écrire', newConv: 'Commencer une nouvelle conversation', contact: 'Partager mes coordonnées (facultatif)',
      name: 'Nom', email: 'E-mail', phone: 'Téléphone', save: 'Enregistrer', cancel: 'Annuler',
      thanks: 'Merci ! Vos coordonnées ont été enregistrées.', welcome: 'Bonjour ! Je suis l’assistant de {name}. Comment puis-je vous aider ?',
      errGeneric: 'Désolé, une erreur est survenue. Veuillez réessayer.', errRate: 'Vous envoyez des messages trop vite. Veuillez patienter un instant.',
      errNet: 'Impossible de joindre le chat. Vérifiez votre connexion et réessayez.', preview: 'Aperçu : les messages ne sont pas envoyés.',
      powered: 'Propulsé par INSIA', contactFirst: 'Envoyez d’abord un message, puis vous pourrez partager vos coordonnées.',
      contactIntro: 'Ne partagez que ce que vous souhaitez. Tous les champs sont facultatifs.', starters: 'Questions suggérées'
    },
    ar: {
      open: 'فتح المحادثة', close: 'إغلاق المحادثة', menu: 'خيارات المحادثة', placeholder: 'اكتب رسالتك…', send: 'إرسال',
      typing: 'جارٍ الكتابة', newConv: 'بدء محادثة جديدة', contact: 'مشاركة بيانات التواصل (اختياري)',
      name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف', save: 'حفظ', cancel: 'إلغاء',
      thanks: 'شكرا لك! تم حفظ بياناتك.', welcome: 'مرحبا! أنا مساعد {name}. كيف يمكنني مساعدتك؟',
      errGeneric: 'عذرا، حدث خطأ. يرجى المحاولة مرة أخرى.', errRate: 'ترسل الرسائل بسرعة كبيرة. يرجى الانتظار قليلا.',
      errNet: 'تعذر الاتصال بالمحادثة. تحقق من اتصالك وحاول مرة أخرى.', preview: 'معاينة: لا يتم إرسال الرسائل.',
      powered: 'مدعوم من INSIA', contactFirst: 'أرسل رسالة أولا ثم يمكنك مشاركة بياناتك.',
      contactIntro: 'شارك فقط ما تريد. كل الحقول اختيارية.', starters: 'أسئلة مقترحة'
    }
  };

  var DEFAULT_COLOR = '#171A1F';
  var INK = '#171A1F';

  function pickLang(setting) {
    if (setting && STR[setting]) return setting;
    var nav = ((navigator.language || 'en') + '').slice(0, 2).toLowerCase();
    return STR[nav] ? nav : 'en';
  }

  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  /** White or charcoal text, whichever is more readable on the owner's chosen color. */
  function readableOn(hex) {
    return contrast(hex, '#FFFFFF') >= contrast(hex, INK) ? '#FFFFFF' : INK;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var ICON_CHAT = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_DOTS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  function icon(svg) { var s = el('span', { class: 'icon', 'aria-hidden': 'true' }); s.innerHTML = svg; return s; } // static, trusted markup only

  function css(color, onColor, side) {
    return [
      ':host{all:initial}',
      '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}',
      '.wrap{position:fixed;bottom:20px;' + side + ':20px;z-index:2147483000;display:flex;flex-direction:column;align-items:' + (side === 'right' ? 'flex-end' : 'flex-start') + ';gap:12px;color:#171A1F}',
      '.wrap.inline{position:relative;bottom:auto;left:auto;right:auto;z-index:auto}',
      '.launcher{width:58px;height:58px;border-radius:50%;border:0;background:' + color + ';color:' + onColor + ';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(23,26,31,.25);transition:transform .15s}',
      '.launcher:hover{transform:scale(1.05)}',
      '.launcher:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid ' + color + ';outline-offset:2px}',
      '.panel{width:380px;max-width:calc(100vw - 24px);height:min(600px,calc(100vh - 110px));height:min(600px,calc(100dvh - 110px));background:#fff;border:1px solid #D8CBB8;border-radius:14px;box-shadow:0 18px 50px rgba(23,26,31,.28);display:flex;flex-direction:column;overflow:hidden}',
      '.inline .panel{height:520px;width:100%;max-width:380px;box-shadow:0 8px 24px rgba(23,26,31,.12)}',
      '.head{background:' + color + ';color:' + onColor + ';padding:12px 12px 12px 16px;display:flex;align-items:center;gap:10px}',
      '.avatar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px;overflow:hidden;flex:none;color:' + onColor + '}',
      '.avatar img{width:100%;height:100%;object-fit:cover}',
      '.who{flex:1;min-width:0}',
      '.who b{display:block;font-size:15px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.status{font-size:12px;opacity:.9;display:flex;align-items:center;gap:6px;margin-top:2px}',
      '.dot{width:8px;height:8px;border-radius:50%;background:#3DBE75;display:inline-block}',
      '.iconbtn{background:transparent;border:0;color:inherit;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.iconbtn:hover{background:rgba(255,255,255,.18)}',
      '.menu{position:absolute;top:56px;right:10px;background:#fff;border:1px solid #D8CBB8;border-radius:10px;box-shadow:0 10px 28px rgba(23,26,31,.22);padding:6px;z-index:3;min-width:220px}',
      '[dir=rtl] .menu{right:auto;left:10px}',
      '.menu button{display:block;width:100%;text-align:start;background:none;border:0;padding:10px 12px;border-radius:8px;font-size:14px;color:#171A1F;cursor:pointer}',
      '.menu button:hover{background:#F7F6F2}',
      '.log{flex:1;overflow-y:auto;padding:16px;background:#F7F6F2;display:flex;flex-direction:column;gap:10px}',
      '.msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}',
      '.msg.bot{background:#fff;border:1px solid #E7DFD2;align-self:flex-start;border-end-start-radius:4px}',
      '.msg.user{background:' + color + ';color:' + onColor + ';align-self:flex-end;border-end-end-radius:4px}',
      '.msg.error{background:#FBEFEC;border:1px solid #E3B5AA;color:#7E2D1E;align-self:flex-start}',
      '.msg.note{background:transparent;border:1px dashed #D8CBB8;color:#4B4F57;align-self:center;font-size:13px;text-align:center}',
      '.typing{display:flex;gap:4px;align-items:center;padding:13px 14px}',
      '.typing i{width:7px;height:7px;border-radius:50%;background:#777B83;display:block;animation:b 1.2s infinite ease-in-out}',
      '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}',
      '@keyframes b{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}',
      '@media (prefers-reduced-motion:reduce){.typing i{animation:none;opacity:.7}.launcher{transition:none}}',
      '.chips{display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start;max-width:100%}',
      '.chip{background:#fff;border:1px solid ' + color + ';color:#171A1F;border-radius:999px;padding:7px 12px;font-size:13.5px;cursor:pointer;text-align:start}',
      '.chip:hover{background:#F7F6F2}',
      '.chip[disabled]{cursor:default;opacity:.8}',
      '.contact{padding:12px 16px;background:#fff;border-top:1px solid #E7DFD2;display:flex;flex-direction:column;gap:8px}',
      '.contact p{margin:0;font-size:13px;color:#4B4F57}',
      '.contact input{width:100%;height:38px;border:1px solid #D8CBB8;border-radius:8px;padding:0 10px;font-size:14px;background:#fff;color:#171A1F}',
      '.row{display:flex;gap:8px;justify-content:flex-end}',
      '.btn{height:36px;padding:0 14px;border-radius:8px;border:1px solid #D8CBB8;background:#fff;color:#171A1F;font-size:14px;cursor:pointer}',
      '.btn.primary{background:' + color + ';color:' + onColor + ';border-color:' + color + '}',
      '.btn[disabled]{opacity:.55;cursor:default}',
      '.form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #E7DFD2;background:#fff}',
      '.form input{flex:1;min-width:0;height:42px;border:1px solid #D8CBB8;border-radius:10px;padding:0 12px;font-size:15px;background:#fff;color:#171A1F}',
      '.form input:disabled{background:#F7F6F2}',
      '.send{width:42px;height:42px;border-radius:10px;border:0;background:' + color + ';color:' + onColor + ';cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}',
      '.send[disabled]{opacity:.5;cursor:default}',
      '.foot{font-size:11.5px;color:#777B83;text-align:center;padding:0 0 8px;background:#fff}',
      '.icon{display:inline-flex}',
      '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
      '@media (max-width:480px){.form input,.contact input{font-size:16px}.wrap:not(.inline) .panel{position:fixed;inset:0;width:100%;max-width:none;height:100%;border-radius:0;border:0}.wrap.open:not(.inline) .launcher{display:none}}'
    ].join('');
  }

  function safeColor(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_COLOR; }

  /**
   * opts: { config, api, key, preview, container }
   * Returns { open, close, update(config), destroy() }
   */
  function create(opts) {
    var preview = !!opts.preview;
    var cfg = opts.config;
    var api = (opts.api || '').replace(/\/+$/, '');
    var storeKey = 'insia-widget:' + (opts.key || 'preview');
    var host = el('div', { 'data-insia-widget': '' });
    var root = host.attachShadow({ mode: 'open' });
    var state = {
      open: preview, messages: [], busy: false, menu: false, contact: false, contactNote: '',
      conversationId: null, token: null, historyLoaded: false, started: false
    };
    var t = STR.en;
    var refs = {};

    function readStore() {
      try { var raw = window.localStorage.getItem(storeKey); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }
    function writeStore() {
      try { window.localStorage.setItem(storeKey, JSON.stringify({ token: state.token, conversationId: state.conversationId })); } catch (e) { /* storage blocked: stay in memory */ }
    }
    function newToken() {
      var bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);
      return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    if (!preview) {
      var saved = readStore();
      state.token = saved && /^[a-f0-9]{64}$/.test(saved.token) ? saved.token : newToken();
      state.conversationId = saved && typeof saved.conversationId === 'string' ? saved.conversationId : null;
      writeStore();
    }

    function post(body) {
      body.public_key = opts.key;
      body.session_token = state.token;
      return fetch(api + '/widget-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; }); });
    }

    function welcomeText() {
      return cfg.welcome_message ? cfg.welcome_message : t.welcome.replace('{name}', cfg.business_name || cfg.display_name);
    }

    function push(role, text, extra) {
      state.messages.push({ role: role, text: text, kind: extra || '' });
      renderLog();
    }

    function setBusy(v) {
      state.busy = v;
      if (refs.send) refs.send.disabled = v || preview;
      renderLog();
    }

    function resetConversation(keepMessages) {
      state.conversationId = null;
      state.historyLoaded = true;
      if (!keepMessages) state.messages = [];
      writeStore();
    }

    function loadHistory() {
      if (preview || state.historyLoaded || !state.conversationId) { state.historyLoaded = true; return Promise.resolve(); }
      state.historyLoaded = true;
      return post({ action: 'history', conversation_id: state.conversationId }).then(function (r) {
        if (r.status !== 200 || r.data.status === 'closed') { resetConversation(); return; }
        state.messages = (r.data.messages || []).map(function (m) { return { role: m.role === 'customer' ? 'user' : 'bot', text: String(m.text), kind: '' }; });
        renderLog();
      }).catch(function () { /* offline: start fresh in the UI, history is still stored */ });
    }

    function send(text, retried) {
      text = (text || '').trim();
      if (!text || state.busy) return;
      if (preview) return;
      if (!retried) push('user', text);
      setBusy(true);
      post({ action: 'message', message: text, conversation_id: state.conversationId }).then(function (r) {
        if ((r.data.code === 'conversation_closed' || r.data.code === 'conversation_not_found' || r.data.code === 'conversation_full') && !retried) {
          resetConversation(true);
          setBusy(false);
          return send(text, true);
        }
        if (r.status === 200 && typeof r.data.reply === 'string') {
          state.conversationId = r.data.conversation_id;
          writeStore();
          push('bot', r.data.reply);
        } else if (r.status === 429) {
          push('bot', t.errRate, 'error');
        } else {
          push('bot', (typeof r.data.error === 'string' && r.status < 500 && r.status !== 404) ? r.data.error : t.errGeneric, 'error');
        }
        setBusy(false);
      }).catch(function () {
        push('bot', t.errNet, 'error');
        setBusy(false);
      });
    }

    function startNew() {
      var old = state.conversationId;
      if (old && !preview) post({ action: 'end', conversation_id: old }).catch(function () { /* best effort */ });
      resetConversation();
      state.menu = false;
      state.contact = false;
      renderAll();
      if (state.open && !preview && refs.input) refs.input.focus(); // the rebuild dropped focus; keep keyboard users in the chat
    }

    function submitContact(values) {
      if (!state.conversationId) { state.contactNote = t.contactFirst; renderContact(); return; }
      post({ action: 'contact', conversation_id: state.conversationId, contact: values }).then(function (r) {
        if (r.status === 200) { state.contactNote = t.thanks; state.contact = false; push('bot', t.thanks, 'note'); renderContact(); }
        else { state.contactNote = typeof r.data.error === 'string' ? r.data.error : t.errGeneric; renderContact(); }
      }).catch(function () { state.contactNote = t.errNet; renderContact(); });
    }

    // ---------------------------------------------------------------- rendering
    function renderLog() {
      var log = refs.log;
      if (!log) return;
      while (log.firstChild) log.removeChild(log.firstChild);
      log.appendChild(el('div', { class: 'msg bot', dir: 'auto', text: welcomeText() }));
      var userStarted = state.messages.some(function (m) { return m.role === 'user'; });
      var starters = cfg.starter_questions || [];
      if (!userStarted && starters.length) {
        var chips = el('div', { class: 'chips', role: 'group', 'aria-label': t.starters });
        starters.forEach(function (q) {
          chips.appendChild(el('button', { class: 'chip', type: 'button', dir: 'auto', text: q, disabled: preview || state.busy, onclick: function () { send(q); } }));
        });
        log.appendChild(chips);
      }
      state.messages.forEach(function (m) {
        log.appendChild(el('div', { class: 'msg ' + (m.kind === 'error' ? 'error' : m.kind === 'note' ? 'note' : m.role), dir: 'auto', text: m.text }));
      });
      if (state.busy) {
        var typing = el('div', { class: 'msg bot typing', role: 'status', 'aria-label': t.typing }, [el('i'), el('i'), el('i')]);
        log.appendChild(typing);
      }
      if (preview) log.appendChild(el('div', { class: 'msg note', text: t.preview }));
      log.scrollTop = log.scrollHeight;
    }

    function renderContact() {
      var box = refs.contact;
      if (!box) return;
      while (box.firstChild) box.removeChild(box.firstChild);
      box.style.display = state.contact ? 'flex' : 'none';
      if (!state.contact) return;
      var name = el('input', { type: 'text', placeholder: t.name, 'aria-label': t.name, maxlength: '80', autocomplete: 'name' });
      var email = el('input', { type: 'email', placeholder: t.email, 'aria-label': t.email, maxlength: '254', autocomplete: 'email' });
      var phone = el('input', { type: 'tel', placeholder: t.phone, 'aria-label': t.phone, maxlength: '30', autocomplete: 'tel' });
      box.appendChild(el('p', { text: t.contactIntro }));
      [name, email, phone].forEach(function (i) { box.appendChild(i); });
      if (state.contactNote) box.appendChild(el('p', { role: 'alert', text: state.contactNote }));
      box.appendChild(el('div', { class: 'row' }, [
        el('button', { class: 'btn', type: 'button', text: t.cancel, onclick: function () { state.contact = false; state.contactNote = ''; renderContact(); } }),
        el('button', { class: 'btn primary', type: 'button', text: t.save, onclick: function () { submitContact({ name: name.value, email: email.value, phone: phone.value }); } })
      ]));
    }

    function renderMenu() {
      var menu = refs.menu;
      if (!menu) return;
      while (menu.firstChild) menu.removeChild(menu.firstChild);
      menu.style.display = state.menu ? 'block' : 'none';
      if (!state.menu) return;
      menu.appendChild(el('button', { type: 'button', text: t.contact, onclick: function () { state.menu = false; state.contact = true; state.contactNote = ''; renderMenu(); renderContact(); } }));
      menu.appendChild(el('button', { type: 'button', text: t.newConv, onclick: startNew }));
    }

    function togglePanel(open) {
      state.open = open;
      if (refs.panel) refs.panel.style.display = open ? 'flex' : 'none';
      if (refs.wrap) refs.wrap.classList.toggle('open', open);
      if (refs.launcher) refs.launcher.setAttribute('aria-expanded', String(open));
      if (open) {
        if (!state.started) { state.started = true; loadHistory().then(renderLog); }
        setTimeout(function () { if (refs.input && !preview) refs.input.focus(); }, 30);
      } else if (refs.launcher && !preview) {
        refs.launcher.focus();
      }
    }

    function renderAll() {
      var lang = pickLang(cfg.greeting_language);
      t = STR[lang];
      var color = safeColor(cfg.primary_color);
      var onColor = readableOn(color);
      var side = cfg.position === 'bottom-left' ? 'left' : 'right';
      while (root.firstChild) root.removeChild(root.firstChild);
      refs = {};
      root.appendChild(el('style', { text: css(color, onColor, side) }));

      var avatar = el('div', { class: 'avatar' });
      if (cfg.logo_url && /^https:\/\//i.test(cfg.logo_url)) {
        var img = el('img', { src: cfg.logo_url, alt: '' });
        img.addEventListener('error', function () { avatar.removeChild(img); avatar.textContent = (cfg.display_name || '?').charAt(0).toUpperCase(); });
        avatar.appendChild(img);
      } else {
        avatar.textContent = (cfg.display_name || '?').charAt(0).toUpperCase();
      }
      var who = el('div', { class: 'who' }, [el('b', { text: cfg.display_name })]);
      if (cfg.show_status) who.appendChild(el('span', { class: 'status' }, [el('span', { class: 'dot' }), el('span', { text: cfg.status_text || 'Online' })]));

      refs.menu = el('div', { class: 'menu', role: 'menu' });
      refs.contact = el('div', { class: 'contact' });
      refs.log = el('div', { class: 'log', role: 'log', 'aria-live': 'polite' });
      refs.input = el('input', {
        type: 'text', dir: 'auto', placeholder: t.placeholder, 'aria-label': t.placeholder, maxlength: '1000', autocomplete: 'off', disabled: preview,
        onkeydown: function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); var v = refs.input.value; refs.input.value = ''; send(v); } }
      });
      refs.send = el('button', { class: 'send', type: 'button', 'aria-label': t.send, disabled: preview || state.busy, onclick: function () { var v = refs.input.value; refs.input.value = ''; send(v); } }, [icon(ICON_SEND)]);

      refs.panel = el('section', { class: 'panel', role: 'dialog', 'aria-label': cfg.display_name, dir: lang === 'ar' ? 'rtl' : 'ltr' }, [
        el('header', { class: 'head' }, [
          avatar, who,
          el('button', { class: 'iconbtn', type: 'button', 'aria-label': t.menu, 'aria-haspopup': 'menu', onclick: function (e) { e.stopPropagation(); state.menu = !state.menu; renderMenu(); } }, [icon(ICON_DOTS)]),
          el('button', { class: 'iconbtn', type: 'button', 'aria-label': t.close, onclick: function () { togglePanel(false); } }, [icon(ICON_X)])
        ]),
        refs.menu, refs.log, refs.contact,
        el('div', { class: 'form' }, [refs.input, refs.send]),
        el('div', { class: 'foot', text: t.powered })
      ]);
      refs.launcher = el('button', { class: 'launcher', type: 'button', 'aria-label': t.open, 'aria-expanded': String(state.open), onclick: function () { togglePanel(!state.open); } }, [icon(ICON_CHAT)]);
      refs.wrap = el('div', { class: 'wrap' + (preview ? ' inline' : '') + (state.open ? ' open' : '') }, [refs.panel, refs.launcher]);
      root.appendChild(refs.wrap);
      refs.panel.style.display = state.open ? 'flex' : 'none';
      renderLog(); renderMenu(); renderContact();
    }

    root.addEventListener('click', function () { if (state.menu) { state.menu = false; renderMenu(); } });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || preview) return;
      if (state.menu) { state.menu = false; renderMenu(); } else if (state.open) togglePanel(false);
    });
    renderAll();
    (opts.container || document.body).appendChild(host);

    return {
      open: function () { togglePanel(true); },
      close: function () { togglePanel(false); },
      update: function (next) { cfg = next; renderAll(); },
      destroy: function () { if (host.parentNode) host.parentNode.removeChild(host); }
    };
  }

  function fetchConfig(api, key) {
    return fetch(api.replace(/\/+$/, '') + '/widget-config?key=' + encodeURIComponent(key))
      .then(function (res) { if (!res.ok) throw new Error('INSIA widget: configuration unavailable (' + res.status + ').'); return res.json(); });
  }

  function whenReady(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  var mounted = {};
  function autoInit(script) {
    var key = script.getAttribute('data-key');
    var api = script.getAttribute('data-api');
    if (!key || !api || mounted[key]) return;
    if (!window.crypto || !window.crypto.getRandomValues || !window.fetch || !Element.prototype.attachShadow) return; // very old browser: do nothing
    mounted[key] = true;
    fetchConfig(api, key).then(function (config) {
      whenReady(function () { create({ config: config, api: api, key: key }); });
    }).catch(function (err) { if (window.console) console.warn(err && err.message ? err.message : err); });
  }

  window.InsiaWidget = {
    /** Used by the dashboard: renders an inline, non-interactive preview and returns a controller. */
    preview: function (container, config) { return create({ config: config, preview: true, container: container }); },
    mount: function (options) { return create(options); }
  };

  var current = document.currentScript || document.querySelector('script[data-key][src*="insia-widget"]');
  if (current && current.getAttribute('data-key')) autoInit(current);
})();
