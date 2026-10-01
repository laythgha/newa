/*
 * Floating chat widget. Add to any page with:
 *
 *   <script src="https://YOUR-BOT-SERVER/widget.js" defer
 *           data-title="Ask about Jane"
 *           data-greeting="Hi! Ask me anything about Jane's experience."
 *           data-color="#2563eb"
 *           data-position="right"></script>
 *
 * All data-* attributes are optional.
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
  var TITLE = cfg.title || "Ask me anything";
  var GREETING =
    cfg.greeting || "Hi! Ask me about my experience, skills, or availability.";
  var COLOR = cfg.color || "#2563eb";
  var SIDE = cfg.position === "left" ? "left" : "right";
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

  // ---------- DOM (inside a shadow root so the site's CSS can't interfere) ----------

  var host = document.createElement("div");
  host.id = "resume-chatbot";
  host.style.cssText =
    "position:fixed;z-index:2147483000;bottom:0;" + SIDE + ":0;width:0;height:0;";
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
    ".launcher{position:fixed;bottom:20px;" + SIDE + ":20px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;" +
    "background:" + COLOR + ";color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".launcher:hover{transform:scale(1.06)}" +
    ".launcher svg{width:28px;height:28px}" +
    ".panel{position:fixed;bottom:92px;" + SIDE + ":20px;width:370px;max-width:calc(100vw - 40px);height:540px;max-height:calc(100vh - 120px);" +
    "background:#fff;color:#1f2937;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden}" +
    ".panel.open{display:flex}" +
    ".header{background:" + COLOR + ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}" +
    ".header h2{margin:0;font-size:16px;font-weight:600}" +
    ".icon-btn{background:none;border:none;color:#fff;cursor:pointer;font-size:13px;opacity:.85;padding:4px 6px;border-radius:6px}" +
    ".icon-btn:hover{opacity:1;background:rgba(255,255,255,.15)}" +
    ".messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f9fafb}" +
    ".msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}" +
    ".msg.bot{background:#fff;border:1px solid #e5e7eb;align-self:flex-start;border-bottom-left-radius:4px}" +
    ".msg.user{background:" + COLOR + ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px}" +
    ".msg.error{background:#fef2f2;border-color:#fecaca;color:#991b1b}" +
    ".msg a{color:inherit;text-decoration:underline}" +
    ".typing span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#9ca3af;animation:b 1.2s infinite}" +
    ".typing span:nth-child(2){animation-delay:.2s}.typing span:nth-child(3){animation-delay:.4s}" +
    "@keyframes b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}" +
    "form{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e7eb;background:#fff}" +
    "textarea{flex:1;resize:none;border:1px solid #d1d5db;border-radius:10px;padding:9px 11px;font-size:14px;max-height:100px;outline:none;color:#111827;background:#fff}" +
    "textarea:focus{border-color:" + COLOR + "}" +
    "button.send{background:" + COLOR + ";color:#fff;border:none;border-radius:10px;padding:0 14px;font-size:14px;cursor:pointer}" +
    "button.send:disabled{opacity:.5;cursor:default}" +
    "@media (max-width:480px){.panel{top:0;bottom:0;left:0;right:0;width:100%;max-width:none;height:100%;max-height:none;border-radius:0}" +
    ".panel.open~.launcher{display:none}}" +
    "</style>" +
    '<div class="panel" role="dialog" aria-label="' + esc(TITLE) + '">' +
    '<div class="header"><h2></h2><div>' +
    '<button class="icon-btn reset" title="Start a new conversation">New chat</button>' +
    '<button class="icon-btn close" aria-label="Close chat">&#x2715;</button></div></div>' +
    '<div class="messages" aria-live="polite"></div>' +
    '<form><textarea rows="1" placeholder="Type your question..." aria-label="Your message"></textarea>' +
    '<button class="send" type="submit">Send</button></form>' +
    "</div>" +
    '<button class="launcher" aria-label="Open chat">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>';

  var panel = root.querySelector(".panel");
  var launcher = root.querySelector(".launcher");
  var list = root.querySelector(".messages");
  var form = root.querySelector("form");
  var input = root.querySelector("textarea");
  var sendBtn = root.querySelector(".send");
  root.querySelector("h2").textContent = TITLE;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Minimal formatting: **bold**, "- " bullets, and clickable links/emails.
  function format(text) {
    return esc(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/^[-*] /gm, "• ")
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/([\w.+-]+@[\w-]+\.[\w.-]+\w)/g, '<a href="mailto:$1">$1</a>');
  }

  function addBubble(role, text) {
    var el = document.createElement("div");
    el.className = "msg " + role;
    el.innerHTML = format(text);
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    return el;
  }

  function render() {
    list.innerHTML = "";
    addBubble("bot", GREETING);
    history.forEach(function (m) {
      addBubble(m.role === "user" ? "user" : "bot", m.content);
    });
  }

  function setOpen(open) {
    panel.classList.toggle("open", open);
    launcher.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) {
      if (!list.childElementCount) render();
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  launcher.addEventListener("click", function () {
    setOpen(!panel.classList.contains("open"));
  });
  root.querySelector(".close").addEventListener("click", function () { setOpen(false); });
  root.querySelector(".reset").addEventListener("click", function () {
    if (busy) return;
    history = [];
    saveHistory();
    render();
  });
  root.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit"));
    }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 100) + "px";
  });

  // ---------- talking to the server ----------

  var busy = false;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    input.style.height = "auto";
    history.push({ role: "user", content: text });
    saveHistory();
    addBubble("user", text);
    ask();
  });

  function ask() {
    busy = true;
    sendBtn.disabled = true;
    var bubble = addBubble("bot", "");
    bubble.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
    var answer = "";

    function finish(errorMessage) {
      busy = false;
      sendBtn.disabled = false;
      if (errorMessage && !answer) {
        bubble.className = "msg bot error";
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
            list.scrollTop = list.scrollHeight;
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
