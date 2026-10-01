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
 *   data-color        Accent color (default: slate #1e293b)
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
      ? "Hi! I'm " + FIRST + "'s AI assistant. Ask me about " + FIRST + "'s experience, skills, or availability."
      : "Hi! Ask me about my experience, skills, or availability.");
  var SUGGESTIONS = cfg.suggestions
    ? cfg.suggestions.split("|").map(function (s) { return s.trim(); }).filter(Boolean)
    : FIRST
      ? ["What's " + FIRST + "'s tech stack?", "Summarize " + FIRST + "'s experience", "Is " + FIRST + " open to new roles?", "How can I get in touch?"]
      : ["What's the tech stack?", "Summarize the experience", "Open to new roles?", "How can I get in touch?"];
  var LABEL = cfg.label || (FIRST ? "Ask about " + FIRST : "Chat");
  var ACCENT = cfg.color || "#1e293b";
  var THEME = cfg.theme === "dark" || cfg.theme === "auto" ? cfg.theme : "light";
  var SIDE = cfg.position === "left" ? "left" : "right";
  var INITIALS = NAME
    ? NAME.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase()
    : "AI";
  var STORAGE_KEY = "resume-chatbot:" + SERVER;

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

  var ICONS = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  };

  // ---------- styles ----------

  var LIGHT =
    "--bg:#ffffff;--surface:#f4f4f5;--surface-2:#fafafa;--border:#e4e4e7;--text:#18181b;--muted:#71717a;" +
    "--bot-bg:#f4f4f5;--bot-text:#18181b;--code-bg:#e4e4e7;--shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.08),0 24px 56px rgba(0,0,0,.10);";
  var DARK =
    "--bg:#18181b;--surface:#27272a;--surface-2:#1f1f22;--border:#3f3f46;--text:#fafafa;--muted:#a1a1aa;" +
    "--bot-bg:#27272a;--bot-text:#f4f4f5;--code-bg:#3f3f46;--shadow:0 1px 2px rgba(0,0,0,.3),0 24px 56px rgba(0,0,0,.5);";

  var css =
    ":host{all:initial}" +
    ".root{--accent:" + ACCENT + ";" + (THEME === "dark" ? DARK : LIGHT) + "}" +
    (THEME === "auto" ? "@media (prefers-color-scheme:dark){.root{" + DARK + "}}" : "") +
    "*{box-sizing:border-box;margin:0;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}" +
    "button{font:inherit;cursor:pointer;border:none;background:none;color:inherit}" +
    "button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}" +
    "svg{display:block}" +

    // launcher
    ".launcher{position:fixed;bottom:24px;" + SIDE + ":24px;display:flex;align-items:center;gap:10px;height:52px;padding:0 20px 0 16px;" +
    "border-radius:999px;background:var(--accent);color:#fff;font-size:14.5px;font-weight:600;letter-spacing:-.01em;" +
    "box-shadow:0 4px 14px rgba(0,0,0,.18),0 1px 3px rgba(0,0,0,.12);transition:transform .2s ease,box-shadow .2s ease}" +
    ".launcher:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.22),0 2px 4px rgba(0,0,0,.12)}" +
    ".launcher svg{width:20px;height:20px}" +
    ".launcher .ic-close{display:none}" +
    ".root.open .launcher{width:52px;padding:0;justify-content:center}" +
    ".root.open .launcher .label,.root.open .launcher .ic-chat{display:none}" +
    ".root.open .launcher .ic-close{display:block}" +

    // panel
    ".panel{position:fixed;bottom:92px;" + SIDE + ":24px;width:392px;height:min(640px,calc(100vh - 120px));" +
    "background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);" +
    "display:flex;flex-direction:column;overflow:hidden;opacity:0;visibility:hidden;transform:translateY(12px) scale(.98);" +
    "transform-origin:bottom " + SIDE + ";transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s}" +
    ".root.open .panel{opacity:1;visibility:visible;transform:none;transition:opacity .2s ease,transform .2s ease}" +

    // header
    ".header{display:flex;align-items:center;gap:12px;padding:16px 14px 16px 18px;border-bottom:1px solid var(--border)}" +
    ".avatar{position:relative;flex:none;width:40px;height:40px;border-radius:50%;background:var(--accent);color:#fff;" +
    "display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;letter-spacing:.02em}" +
    ".avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}" +
    ".avatar::after{content:'';position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:#22c55e;border:2px solid var(--bg)}" +
    ".who{flex:1;min-width:0}" +
    ".who h2{font-size:15px;font-weight:600;letter-spacing:-.01em;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".who p{font-size:12.5px;color:var(--muted);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".hbtn{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--muted);transition:background .15s,color .15s}" +
    ".hbtn:hover{background:var(--surface);color:var(--text)}" +
    ".hbtn svg{width:17px;height:17px}" +
    ".hbtn.close{display:none}" +

    // messages
    ".messages{flex:1;overflow-y:auto;padding:20px 18px 8px;display:flex;flex-direction:column;gap:14px;scroll-behavior:smooth}" +
    ".messages::-webkit-scrollbar{width:6px}.messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}" +
    ".row{display:flex;gap:10px;align-items:flex-end}" +
    ".row.user{justify-content:flex-end}" +
    ".row .mini{flex:none;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-size:10.5px;font-weight:600;display:flex;align-items:center;justify-content:center;overflow:hidden}" +
    ".row .mini img{width:100%;height:100%;object-fit:cover}" +
    ".msg{max-width:82%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.55;word-wrap:break-word;overflow-wrap:anywhere}" +
    ".bot .msg{background:var(--bot-bg);color:var(--bot-text);border-bottom-left-radius:4px}" +
    ".user .msg{background:var(--accent);color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}" +
    ".msg.error{background:#fef2f2;color:#991b1b}" +
    ".msg p+p,.msg p+ul,.msg ul+p{margin-top:8px}" +
    ".msg ul{padding-left:18px}.msg li+li{margin-top:3px}" +
    ".msg strong{font-weight:600}" +
    ".msg code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;background:var(--code-bg);padding:1px 5px;border-radius:4px}" +
    ".msg a{color:inherit;text-decoration:underline;text-underline-offset:2px}" +
    ".typing{display:flex;gap:4px;padding:4px 2px}" +
    ".typing span{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:b 1.2s infinite ease-in-out}" +
    ".typing span:nth-child(2){animation-delay:.15s}.typing span:nth-child(3){animation-delay:.3s}" +
    "@keyframes b{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:.9;transform:translateY(-3px)}}" +

    // suggestions
    ".suggest{display:flex;flex-wrap:wrap;gap:8px;padding-left:36px}" +
    ".chip{padding:7px 12px;border:1px solid var(--border);border-radius:999px;font-size:13px;color:var(--text);background:var(--bg);transition:border-color .15s,background .15s}" +
    ".chip:hover{border-color:var(--accent);background:var(--surface-2)}" +

    // composer
    ".composer{padding:12px 14px 10px}" +
    ".box{display:flex;align-items:flex-end;gap:8px;border:1px solid var(--border);border-radius:12px;padding:6px 6px 6px 14px;background:var(--bg);transition:border-color .15s,box-shadow .15s}" +
    ".box:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 15%,transparent)}" +
    "textarea{flex:1;resize:none;border:none;outline:none!important;background:transparent;color:var(--text);font-size:14px;line-height:1.5;padding:6px 0;max-height:120px}" +
    "textarea::placeholder{color:var(--muted)}" +
    ".send{flex:none;width:34px;height:34px;border-radius:9px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;transition:opacity .15s}" +
    ".send svg{width:17px;height:17px}" +
    ".send:disabled{opacity:.3;cursor:default}" +
    ".note{margin-top:8px;text-align:center;font-size:11px;color:var(--muted);line-height:1.4}" +

    // phones: full-screen panel
    "@media (max-width:520px){" +
    ".panel{inset:0;width:100%;height:100%;border-radius:0;border:none;transform:translateY(16px)}" +
    ".hbtn.close{display:flex}" +
    ".root.open .launcher{display:none}" +
    ".launcher{bottom:16px;" + SIDE + ":16px}}" +
    "@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}";

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
    '<div class="who"><h2></h2><p></p></div>' +
    '<button class="hbtn reset" title="New conversation" aria-label="New conversation">' + ICONS.reset + "</button>" +
    '<button class="hbtn close" aria-label="Close chat">' + ICONS.chevron + "</button>" +
    "</header>" +
    '<div class="messages" aria-live="polite"></div>' +
    '<form class="composer">' +
    '<div class="box"><textarea rows="1" placeholder="Ask a question..." aria-label="Your question"></textarea>' +
    '<button class="send" type="submit" aria-label="Send" disabled>' + ICONS.send + "</button></div>" +
    '<p class="note">AI-generated answers based on ' + (FIRST ? esc(FIRST) + "'s" : "the") + " resume. Verify important details.</p>" +
    "</form>" +
    "</section>" +
    '<button class="launcher" aria-label="' + esc(LABEL) + '" aria-expanded="false">' +
    '<span class="ic-chat">' + ICONS.chat + '</span><span class="ic-close">' + ICONS.close + "</span>" +
    '<span class="label"></span></button>' +
    "</div>";

  var rootEl = shadow.querySelector(".root");
  var panel = shadow.querySelector(".panel");
  var launcher = shadow.querySelector(".launcher");
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
    SUGGESTIONS.forEach(function (q) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = q;
      chip.addEventListener("click", function () { submit(q); });
      wrap.appendChild(chip);
    });
    list.appendChild(wrap);
  }

  function render() {
    list.innerHTML = "";
    addMessage("bot", GREETING);
    history.forEach(function (m) { addMessage(m.role, m.content); });
    renderSuggestions();
  }

  function setOpen(open) {
    rootEl.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      if (!list.childElementCount) render();
      setTimeout(function () { input.focus(); }, 60);
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

  function mount() {
    document.body.appendChild(host);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
