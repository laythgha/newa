/*
 * Floating chat widget. Add to any page with:
 *
 *   <script src="https://YOUR-BOT-SERVER/widget.js" defer
 *           data-name="Jane Doe"
 *           data-subtitle="Senior Software Engineer"></script>
 *
 * Optional data-* attributes:
 *   data-name         Person the bot answers about (used for initials and default text)
 *   data-subtitle     Line under the name in the header
 *   data-avatar       URL of a headshot (otherwise initials are shown)
 *   data-greeting     First message
 *   data-suggestions  Starter questions separated by "|"
 *   data-label        Text on the launcher button
 *   data-teaser       Text of the small pop-up next to the button, or "off"
 *   data-color        Accent color (default: indigo #4f46e5)
 *   data-color2       Second gradient color (default: violet #7c3aed)
 *   data-theme        "light" (default), "dark", or "auto" (follow the visitor's system)
 *   data-position     "right" (default) or "left"
 */
(function () {
  "use strict";
  if (window.__resumeChatbotLoaded) return;
  window.__resumeChatbotLoaded = true;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"]');
  var cfg = (script && script.dataset) || {};
  var SERVER = new URL(script ? script.src : location.href).origin;

  var NAME = (cfg.name || "").trim();
  var FIRST = NAME ? NAME.split(/\s+/)[0] : "";
  var TITLE = cfg.title || NAME || "Ask me anything";
  var SUBTITLE = cfg.subtitle || "AI assistant";
  var GREETING =
    cfg.greeting ||
    (FIRST
      ? "Hi there! 👋 I'm " + FIRST + "'s AI assistant. Ask me anything about " + FIRST + "'s experience, skills, or availability."
      : "Hi there! 👋 Ask me about my experience, skills, or availability.");
  var DEFAULT_SUGGESTIONS = FIRST
    ? ["What's " + FIRST + "'s tech stack?", "Summarize " + FIRST + "'s experience", "Is " + FIRST + " open to new roles?", "How can I get in touch?"]
    : ["What's the tech stack?", "Summarize the experience", "Open to new roles?", "How can I get in touch?"];
  var SUGGESTIONS = cfg.suggestions
    ? cfg.suggestions.split("|").map(function (s) { return s.trim(); }).filter(Boolean)
    : DEFAULT_SUGGESTIONS;
  var LABEL = cfg.label || (FIRST ? "Ask about " + FIRST : "Chat with me");
  var TEASER =
    cfg.teaser === "off"
      ? ""
      : cfg.teaser || (FIRST ? "Hiring? Ask me anything about " + FIRST + "'s experience." : "Have a question? Ask me anything.");
  var ACCENT = cfg.color || "#4f46e5";
  var ACCENT2 = cfg.color2 || (cfg.color ? cfg.color : "#7c3aed");
  var THEME = cfg.theme === "dark" || cfg.theme === "auto" ? cfg.theme : "light";
  var SIDE = cfg.position === "left" ? "left" : "right";
  var INITIALS = NAME
    ? NAME.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase()
    : "AI";
  var STORAGE_KEY = "resume-chatbot:" + SERVER;
  var TEASER_KEY = STORAGE_KEY + ":teaser";

  var history = [];
  try {
    history = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch (e) {}
  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-30)));
    } catch (e) {}
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function svg(paths, width) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (width || 2) +
      '" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
  }
  var ICONS = {
    chat: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" stroke-width="2.6"/>'),
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    send: svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 2.4),
    chevron: svg('<path d="m6 9 6 6 6-6"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    code: svg('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
    briefcase: svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
    rocket: svg('<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>'),
    mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
    sparkle: svg('<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>'),
  };
  var SUGGESTION_ICONS = ["code", "briefcase", "rocket", "mail"];

  // ---------- styles ----------

  var LIGHT =
    "--bg:#ffffff;--canvas:#f6f7fb;--surface:#eef0f6;--border:#e3e6ef;--text:#0f172a;--muted:#64748b;" +
    "--bot-bg:#ffffff;--bot-text:#0f172a;--code-bg:#eef0f6;--dots:rgba(15,23,42,.06);" +
    "--shadow:0 2px 6px rgba(15,23,42,.06),0 24px 64px -12px rgba(15,23,42,.28);";
  var DARK =
    "--bg:#111320;--canvas:#0b0d17;--surface:#1c1f30;--border:#262a3d;--text:#e8eaf3;--muted:#9097b0;" +
    "--bot-bg:#171a2a;--bot-text:#e8eaf3;--code-bg:#262a3d;--dots:rgba(255,255,255,.05);" +
    "--shadow:0 2px 6px rgba(0,0,0,.4),0 24px 64px -12px rgba(0,0,0,.7);";

  var css =
    ":host{all:initial}" +
    ".root{--a1:" + ACCENT + ";--a2:" + ACCENT2 + ";--grad:linear-gradient(135deg,var(--a1),var(--a2));" +
    (THEME === "dark" ? DARK : LIGHT) + "}" +
    (THEME === "auto" ? "@media (prefers-color-scheme:dark){.root{" + DARK + "}}" : "") +
    "*{box-sizing:border-box;margin:0;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}" +
    "button{font:inherit;cursor:pointer;border:none;background:none;color:inherit}" +
    "button:focus-visible{outline:2px solid var(--a1);outline-offset:2px}" +
    "svg{display:block}" +

    // launcher
    ".launcher{position:fixed;bottom:24px;" + SIDE + ":24px;display:flex;align-items:center;gap:10px;height:56px;padding:0 22px 0 18px;" +
    "border-radius:999px;background:var(--grad);color:#fff;font-size:15px;font-weight:600;letter-spacing:-.01em;" +
    "box-shadow:0 10px 30px -6px color-mix(in srgb,var(--a1) 60%,transparent),0 2px 6px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.2);" +
    "transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s,width .25s,padding .25s}" +
    ".launcher:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 16px 36px -6px color-mix(in srgb,var(--a1) 70%,transparent),0 2px 6px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.2)}" +
    ".launcher svg{width:22px;height:22px}" +
    ".launcher::before{content:'';position:absolute;inset:0;border-radius:inherit;background:var(--grad);z-index:-1;animation:ping 2.2s cubic-bezier(0,0,.2,1) 3}" +
    "@keyframes ping{0%{transform:scale(1);opacity:.55}80%,100%{transform:scale(1.35);opacity:0}}" +
    ".launcher .ic-close{display:none}" +
    ".root.open .launcher{width:56px;padding:0;justify-content:center}" +
    ".root.open .launcher::before{display:none}" +
    ".root.open .launcher .label,.root.open .launcher .ic-chat{display:none}" +
    ".root.open .launcher .ic-close{display:block}" +

    // teaser
    ".teaser{position:fixed;bottom:94px;" + SIDE + ":24px;width:270px;display:flex;gap:12px;align-items:flex-start;padding:14px 34px 14px 14px;" +
    "background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);cursor:pointer;" +
    "opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .3s,transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s linear .3s}" +
    ".teaser.show{opacity:1;visibility:visible;transform:none;transition:opacity .3s,transform .3s cubic-bezier(.2,.8,.2,1)}" +
    ".root.open .teaser{display:none}" +
    ".teaser .mini{width:34px;height:34px;font-size:12px}" +
    ".teaser b{display:block;font-size:13.5px;font-weight:600;margin-bottom:2px}" +
    ".teaser span{font-size:13px;color:var(--muted);line-height:1.45}" +
    ".teaser .x{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:6px;color:var(--muted);display:flex;align-items:center;justify-content:center}" +
    ".teaser .x:hover{background:var(--surface);color:var(--text)}" +
    ".teaser .x svg{width:14px;height:14px}" +

    // panel
    ".panel{position:fixed;bottom:96px;" + SIDE + ":24px;width:400px;height:min(660px,calc(100vh - 124px));" +
    "background:var(--canvas);color:var(--text);border-radius:20px;box-shadow:var(--shadow);outline:1px solid var(--border);" +
    "display:flex;flex-direction:column;overflow:hidden;opacity:0;visibility:hidden;transform:translateY(16px) scale(.97);" +
    "transform-origin:bottom " + SIDE + ";transition:opacity .25s ease,transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s linear .3s}" +
    ".root.open .panel{opacity:1;visibility:visible;transform:none;transition:opacity .25s ease,transform .3s cubic-bezier(.2,.8,.2,1)}" +

    // header
    ".header{position:relative;display:flex;align-items:center;gap:14px;padding:20px 14px 20px 20px;color:#fff;background:var(--grad);overflow:hidden}" +
    ".header::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.18) 1px,transparent 1px);background-size:14px 14px;" +
    "-webkit-mask-image:linear-gradient(110deg,transparent 30%,#000 100%);mask-image:linear-gradient(110deg,transparent 30%,#000 100%)}" +
    ".header::after{content:'';position:absolute;width:220px;height:220px;right:-70px;top:-120px;border-radius:50%;background:radial-gradient(rgba(255,255,255,.28),transparent 70%)}" +
    ".header>*{position:relative;z-index:1}" +
    ".avatar{flex:none;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;" +
    "display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;letter-spacing:.02em;" +
    "box-shadow:0 0 0 2px rgba(255,255,255,.55),0 6px 16px rgba(0,0,0,.18);backdrop-filter:blur(4px)}" +
    ".avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}" +
    ".who{flex:1;min-width:0}" +
    ".who h2{font-size:17px;font-weight:700;letter-spacing:-.015em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".who p{font-size:12.5px;opacity:.85;line-height:1.4;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".status{display:inline-flex;align-items:center;gap:6px;margin-top:7px;padding:3px 9px 3px 7px;border-radius:999px;background:rgba(255,255,255,.16);font-size:11.5px;font-weight:500}" +
    ".status i{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 0 rgba(74,222,128,.7);animation:pulse 2s infinite}" +
    "@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}70%{box-shadow:0 0 0 6px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}" +
    ".hbtn{align-self:flex-start;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.85);transition:background .15s,color .15s}" +
    ".hbtn:hover{background:rgba(255,255,255,.16);color:#fff}" +
    ".hbtn svg{width:18px;height:18px}" +
    ".hbtn.close{display:none}" +

    // messages
    ".messages{flex:1;overflow-y:auto;padding:20px 16px 8px;display:flex;flex-direction:column;gap:14px;" +
    "background-image:radial-gradient(var(--dots) 1px,transparent 1px);background-size:18px 18px}" +
    ".messages::-webkit-scrollbar{width:6px}.messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}" +
    ".row{display:flex;gap:10px;align-items:flex-end;animation:rise .35s cubic-bezier(.2,.8,.2,1) both}" +
    "@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
    ".row.user{justify-content:flex-end}" +
    ".mini{flex:none;width:28px;height:28px;border-radius:50%;background:var(--grad);color:#fff;font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center;overflow:hidden}" +
    ".mini img{width:100%;height:100%;object-fit:cover}" +
    ".msg{max-width:80%;padding:11px 15px;border-radius:18px;font-size:14px;line-height:1.55;word-wrap:break-word;overflow-wrap:anywhere}" +
    ".bot .msg{background:var(--bot-bg);color:var(--bot-text);border:1px solid var(--border);border-bottom-left-radius:6px;box-shadow:0 1px 2px rgba(15,23,42,.04)}" +
    ".user .msg{background:var(--grad);color:#fff;border-bottom-right-radius:6px;white-space:pre-wrap;box-shadow:0 4px 12px -4px color-mix(in srgb,var(--a1) 55%,transparent)}" +
    ".msg.error{background:#fef2f2;color:#991b1b;border-color:#fecaca}" +
    ".msg p+p,.msg p+ul,.msg ul+p{margin-top:8px}" +
    ".msg ul{padding-left:4px;list-style:none}.msg li{position:relative;padding-left:16px}.msg li+li{margin-top:4px}" +
    ".msg li::before{content:'';position:absolute;left:2px;top:.62em;width:6px;height:6px;border-radius:2px;background:var(--grad)}" +
    ".msg strong{font-weight:650}" +
    ".msg code{font-family:ui-monospace,SFMono-Regular,'JetBrains Mono',Menlo,Consolas,monospace;font-size:12.5px;background:var(--code-bg);padding:1.5px 6px;border-radius:5px}" +
    ".msg a{color:var(--a1);font-weight:500;text-decoration:underline;text-underline-offset:2px}" +
    ".user .msg a{color:#fff}" +
    ".typing{display:flex;gap:5px;padding:5px 2px}" +
    ".typing span{width:7px;height:7px;border-radius:50%;background:var(--grad);animation:b 1.2s infinite ease-in-out}" +
    ".typing span:nth-child(2){animation-delay:.15s}.typing span:nth-child(3){animation-delay:.3s}" +
    "@keyframes b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}" +

    // suggestions
    ".suggest{display:flex;flex-direction:column;gap:8px;padding-left:38px;animation:rise .4s .1s cubic-bezier(.2,.8,.2,1) both}" +
    ".suggest small{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:2px 0 0 2px}" +
    ".card{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:9px 12px 9px 9px;border:1px solid var(--border);border-radius:12px;" +
    "background:var(--bg);font-size:13.5px;font-weight:500;color:var(--text);transition:border-color .15s,transform .15s,box-shadow .15s}" +
    ".card:hover{border-color:color-mix(in srgb,var(--a1) 45%,var(--border));transform:translateX(2px);box-shadow:0 4px 14px -6px color-mix(in srgb,var(--a1) 40%,transparent)}" +
    ".card .ic{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--a1);background:color-mix(in srgb,var(--a1) 10%,transparent)}" +
    ".card .ic svg{width:16px;height:16px}" +
    ".card .t{flex:1}" +
    ".card .go{color:var(--muted);opacity:0;transition:opacity .15s}.card:hover .go{opacity:1}" +
    ".card .go svg{width:15px;height:15px}" +

    // composer
    ".composer{padding:12px 14px 10px;background:var(--bg);border-top:1px solid var(--border)}" +
    ".box{display:flex;align-items:flex-end;gap:8px;border:1px solid var(--border);border-radius:14px;padding:6px 6px 6px 14px;background:var(--canvas);transition:border-color .15s,box-shadow .15s,background .15s}" +
    ".box:focus-within{border-color:var(--a1);background:var(--bg);box-shadow:0 0 0 4px color-mix(in srgb,var(--a1) 14%,transparent)}" +
    "textarea{flex:1;resize:none;border:none;outline:none!important;background:transparent;color:var(--text);font-size:14px;line-height:1.5;padding:6px 0;max-height:120px}" +
    "textarea::placeholder{color:var(--muted)}" +
    ".send{flex:none;width:36px;height:36px;border-radius:10px;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;transition:opacity .15s,transform .15s}" +
    ".send:not(:disabled):hover{transform:translateY(-1px)}" +
    ".send svg{width:18px;height:18px}" +
    ".send:disabled{opacity:.35;cursor:default}" +
    ".note{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:8px;font-size:11px;color:var(--muted);line-height:1.4}" +
    ".note svg{width:12px;height:12px;color:var(--a1)}" +

    // phones: full-screen panel
    "@media (max-width:520px){" +
    ".panel{inset:0;width:100%;height:100%;border-radius:0;outline:none;transform:translateY(24px)}" +
    ".hbtn.close{display:flex}" +
    ".root.open .launcher{display:none}" +
    ".launcher{bottom:16px;" + SIDE + ":16px}" +
    ".teaser{bottom:84px;" + SIDE + ":16px}}" +
    "@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}";

  // ---------- DOM (inside a shadow root so the site's CSS can't interfere) ----------

  var host = document.createElement("div");
  host.id = "resume-chatbot";
  host.style.cssText = "position:fixed;z-index:2147483000;bottom:0;" + SIDE + ":0;width:0;height:0;";
  var shadow = host.attachShadow({ mode: "open" });

  var avatarHTML = cfg.avatar ? '<img alt="" src="' + esc(cfg.avatar) + '">' : esc(INITIALS);

  shadow.innerHTML =
    "<style>" + css + "</style>" +
    '<div class="root">' +
    '<section class="panel" role="dialog" aria-label="' + esc(TITLE) + ' chat" aria-hidden="true">' +
    '<header class="header">' +
    '<div class="avatar">' + avatarHTML + "</div>" +
    '<div class="who"><h2></h2><p></p><div class="status"><i></i>Online · replies instantly</div></div>' +
    '<button class="hbtn reset" title="New conversation" aria-label="New conversation">' + ICONS.reset + "</button>" +
    '<button class="hbtn close" aria-label="Close chat">' + ICONS.chevron + "</button>" +
    "</header>" +
    '<div class="messages" aria-live="polite"></div>' +
    '<form class="composer">' +
    '<div class="box"><textarea rows="1" placeholder="Ask about skills, projects, availability..." aria-label="Your question"></textarea>' +
    '<button class="send" type="submit" aria-label="Send" disabled>' + ICONS.send + "</button></div>" +
    '<p class="note">' + ICONS.sparkle + "AI answers based on " + (FIRST ? esc(FIRST) + "'s" : "the") + " resume · verify important details</p>" +
    "</form>" +
    "</section>" +
    (TEASER
      ? '<div class="teaser" role="button" tabindex="0" aria-label="Open chat"><div class="mini">' + avatarHTML + "</div>" +
        "<div><b>" + esc(FIRST ? FIRST + "'s assistant" : TITLE) + "</b><span>" + esc(TEASER) + "</span></div>" +
        '<button class="x" aria-label="Dismiss">' + ICONS.close + "</button></div>"
      : "") +
    '<button class="launcher" aria-label="' + esc(LABEL) + '" aria-expanded="false">' +
    '<span class="ic-chat">' + ICONS.chat + '</span><span class="ic-close">' + ICONS.close + "</span>" +
    '<span class="label"></span></button>' +
    "</div>";

  var rootEl = shadow.querySelector(".root");
  var panel = shadow.querySelector(".panel");
  var launcher = shadow.querySelector(".launcher");
  var teaser = shadow.querySelector(".teaser");
  var list = shadow.querySelector(".messages");
  var form = shadow.querySelector("form");
  var input = shadow.querySelector("textarea");
  var sendBtn = shadow.querySelector(".send");
  shadow.querySelector(".who h2").textContent = TITLE;
  shadow.querySelector(".who p").textContent = SUBTITLE;
  shadow.querySelector(".launcher .label").textContent = LABEL;

  // Light formatting: paragraphs, "- " bullet lists, **bold**, `code`, links, emails.
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]+\w)/g, '$1<a href="mailto:$2">$2</a>');
  }
  function format(text) {
    var out = [];
    var listOpen = false;
    var para = [];
    function flushPara() {
      if (para.length) out.push("<p>" + para.join("<br>") + "</p>");
      para = [];
    }
    esc(text).split("\n").forEach(function (line) {
      var item = line.match(/^\s*[-*•]\s+(.*)$/);
      if (item) {
        flushPara();
        if (!listOpen) { out.push("<ul>"); listOpen = true; }
        out.push("<li>" + inline(item[1]) + "</li>");
        return;
      }
      if (listOpen) { out.push("</ul>"); listOpen = false; }
      if (line.trim()) para.push(inline(line));
      else flushPara();
    });
    flushPara();
    if (listOpen) out.push("</ul>");
    return out.join("");
  }

  function scrollDown() {
    list.scrollTop = list.scrollHeight;
  }

  function addMessage(role, text) {
    var row = document.createElement("div");
    row.className = "row " + (role === "user" ? "user" : "bot");
    if (role !== "user") {
      var mini = document.createElement("div");
      mini.className = "mini";
      mini.innerHTML = avatarHTML;
      row.appendChild(mini);
    }
    var bubble = document.createElement("div");
    bubble.className = "msg";
    if (role === "user") bubble.textContent = text;
    else bubble.innerHTML = format(text);
    row.appendChild(bubble);
    list.appendChild(row);
    scrollDown();
    return bubble;
  }

  function renderSuggestions() {
    if (history.length || !SUGGESTIONS.length) return;
    var wrap = document.createElement("div");
    wrap.className = "suggest";
    wrap.innerHTML = "<small>Popular questions</small>";
    SUGGESTIONS.forEach(function (q, i) {
      var icon = cfg.suggestions ? "sparkle" : SUGGESTION_ICONS[i] || "sparkle";
      var card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.innerHTML = '<span class="ic">' + ICONS[icon] + '</span><span class="t"></span><span class="go">' + ICONS.arrow + "</span>";
      card.querySelector(".t").textContent = q;
      card.addEventListener("click", function () { submit(q); });
      wrap.appendChild(card);
    });
    list.appendChild(wrap);
  }

  function render() {
    list.innerHTML = "";
    addMessage("bot", GREETING);
    history.forEach(function (m) { addMessage(m.role, m.content); });
    renderSuggestions();
  }

  function hideTeaser(remember) {
    if (!teaser) return;
    teaser.classList.remove("show");
    if (remember) {
      try { sessionStorage.setItem(TEASER_KEY, "1"); } catch (e) {}
    }
  }

  function setOpen(open) {
    rootEl.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      hideTeaser(true);
      if (!list.childElementCount) render();
      setTimeout(function () { input.focus(); }, 80);
    }
  }

  launcher.addEventListener("click", function () {
    setOpen(!rootEl.classList.contains("open"));
  });
  shadow.querySelector(".close").addEventListener("click", function () { setOpen(false); });
  shadow.querySelector(".reset").addEventListener("click", function () {
    if (busy) return;
    history = [];
    saveHistory();
    render();
    input.focus();
  });
  shadow.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  if (teaser) {
    teaser.addEventListener("click", function () { setOpen(true); });
    teaser.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
    });
    teaser.querySelector(".x").addEventListener("click", function (e) {
      e.stopPropagation();
      hideTeaser(true);
    });
    var seen = false;
    try { seen = !!sessionStorage.getItem(TEASER_KEY); } catch (e) {}
    if (!seen && !history.length) {
      setTimeout(function () {
        if (!rootEl.classList.contains("open")) teaser.classList.add("show");
      }, 3500);
    }
  }

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input.value);
    }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
    sendBtn.disabled = busy || !input.value.trim();
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submit(input.value);
  });

  // ---------- talking to the server ----------

  var busy = false;

  function submit(raw) {
    var text = String(raw || "").trim();
    if (!text || busy) return;
    input.value = "";
    input.style.height = "auto";
    var chips = list.querySelector(".suggest");
    if (chips) chips.remove();
    history.push({ role: "user", content: text });
    saveHistory();
    addMessage("user", text);
    ask();
  }

  function ask() {
    busy = true;
    sendBtn.disabled = true;
    var bubble = addMessage("bot", "");
    bubble.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    var answer = "";

    function finish(errorMessage) {
      busy = false;
      sendBtn.disabled = !input.value.trim();
      if (errorMessage && !answer) {
        bubble.className = "msg error";
        bubble.textContent = errorMessage;
        history.pop(); // let the visitor resend the same question
        saveHistory();
        return;
      }
      history.push({ role: "assistant", content: answer });
      saveHistory();
    }

    fetch(SERVER + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) {
          return res.json().catch(function () { return {}; }).then(function (j) {
            throw new Error(j.error || "Sorry, something went wrong. Please try again.");
          });
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var failed = null;

        function handle(evt) {
          if (evt.type === "text") answer += evt.text;
          else if (evt.type === "reset") answer = "";
          else if (evt.type === "error") failed = evt.message;
          if (answer) {
            bubble.innerHTML = format(answer);
            scrollDown();
          }
        }

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) {
              if (failed || !answer) throw new Error(failed || "Sorry, I didn't get a response. Please try again.");
              return finish();
            }
            buffer += decoder.decode(r.value, { stream: true });
            var parts = buffer.split("\n\n");
            buffer = parts.pop();
            parts.forEach(function (p) {
              if (p.indexOf("data: ") === 0) {
                try { handle(JSON.parse(p.slice(6))); } catch (e) {}
              }
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        finish(err.message || "Network error. Please try again.");
      });
  }

  // Lets the page open the chat from its own buttons:
  //   <button onclick="ResumeChatbot.open()">Ask my AI assistant</button>
  // or ResumeChatbot.ask("What's your tech stack?") to open it with a question.
  window.ResumeChatbot = {
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    ask: function (question) {
      setOpen(true);
      submit(question);
    },
  };

  function mount() {
    document.body.appendChild(host);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
