// Bit: a small assistant robot for the portfolio.
// Answers from window.PORTFOLIO with keyword matching, and optionally from an AI endpoint
// (worker/) when PORTFOLIO.assistant.endpoint is set. AI failures fall back to local answers.
(() => {
  "use strict";
  const P = window.PORTFOLIO;
  if (!P) return;

  const cfg = P.assistant || {};
  const BOT = cfg.name || "Bit";
  const ENDPOINT = (cfg.endpoint || "").trim();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const first = (P.name || "").split(" ").slice(-1)[0] || P.name; // "Visal"

  const store = {
    get(k) { try { return sessionStorage.getItem("bot:" + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem("bot:" + k, v); } catch (e) {} },
  };

  // ---------- DOM ----------
  const ROBOT_SVG = `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <line x1="32" y1="5" x2="32" y2="14" class="bot-stroke"/>
      <circle cx="32" cy="5" r="3.2" class="bot-antenna"/>
      <rect x="10" y="14" width="44" height="34" rx="11" class="bot-head"/>
      <rect x="15.5" y="21" width="33" height="19" rx="7" class="bot-visor"/>
      <g class="bot-eyes">
        <ellipse cx="25" cy="30.5" rx="3.6" ry="4.2" class="bot-eye"/>
        <ellipse cx="39" cy="30.5" rx="3.6" ry="4.2" class="bot-eye"/>
      </g>
      <path d="M27 44 q5 3 10 0" class="bot-stroke bot-mouth"/>
      <rect x="5" y="25" width="5" height="12" rx="2.5" class="bot-ear"/>
      <rect x="54" y="25" width="5" height="12" rx="2.5" class="bot-ear"/>
      <rect x="22" y="50" width="20" height="9" rx="4" class="bot-body"/>
    </svg>`;

  const wrap = document.createElement("div");
  wrap.className = "bot";
  wrap.innerHTML = `
    <div class="bot-bubble" id="bot-bubble" hidden>
      <span id="bot-bubble-text"></span>
      <button class="bot-bubble-x" type="button" aria-label="Dismiss">×</button>
    </div>
    <section class="bot-panel" id="bot-panel" role="dialog" aria-label="${BOT}, portfolio assistant" hidden>
      <header class="bot-panel-head">
        <span class="bot-mini">${ROBOT_SVG}</span>
        <span><strong>${BOT}</strong><span class="c-dim small"> · ${ENDPOINT ? "AI assistant" : "assistant"}</span></span>
        <button class="bot-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="bot-log" id="bot-log" role="log" aria-live="polite"></div>
      <div class="bot-chips" id="bot-chips" aria-label="Suggested questions"></div>
      <form class="bot-form" id="bot-form" autocomplete="off">
        <span class="t-prompt" aria-hidden="true">&gt;</span>
        <input id="bot-in" type="text" maxlength="500" placeholder="Ask about ${first}…" aria-label="Ask ${BOT} a question">
        <button type="submit" aria-label="Send">↵</button>
      </form>
    </section>
    <button class="bot-fab" id="bot-fab" type="button" aria-expanded="false" aria-controls="bot-panel" aria-label="Chat with ${BOT}, the portfolio assistant">
      ${ROBOT_SVG}
    </button>`;
  document.body.appendChild(wrap);

  const $ = (id) => document.getElementById(id);
  const fab = $("bot-fab"), panel = $("bot-panel"), log = $("bot-log"), chipsEl = $("bot-chips");
  const form = $("bot-form"), input = $("bot-in"), bubble = $("bot-bubble"), bubbleText = $("bot-bubble-text");

  // ---------- helpers ----------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const norm = (s) => " " + s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ") + " ";
  const listJoin = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

  // Text with safe auto-links (URLs, emails). Never uses innerHTML for content.
  function richText(parent, text) {
    const re = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      const a = el("a", null, m[0]);
      if (m[0].includes("@") && !m[0].startsWith("http")) a.href = "mailto:" + m[0];
      else { a.href = m[0]; a.target = "_blank"; a.rel = "noopener"; }
      parent.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  // ---------- actions ----------
  const SECTIONS = ["about", "projects", "stack", "github", "log", "contact"];
  const SECTION_LABEL = { about: "/about", projects: "/projects", stack: "/stack", github: "/github", log: "/log", contact: "/contact" };

  const actions = {
    go(id) {
      const t = document.getElementById(id);
      if (!t) return;
      if (matchMedia("(max-width: 600px)").matches) setOpen(false);
      t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      t.classList.remove("bot-flash"); void t.offsetWidth; t.classList.add("bot-flash");
    },
    resume() {
      if (!P.contact.resume) return;
      const a = el("a"); a.href = P.contact.resume; a.download = ""; document.body.appendChild(a); a.click(); a.remove();
    },
    async email() {
      try { await navigator.clipboard.writeText(P.contact.email); say("Copied " + P.contact.email + " to your clipboard. 📋"); }
      catch (e) { say("Here it is: " + P.contact.email); }
    },
  };
  const ACTION_LABEL = { resume: "⬇ Download resume", email: "Copy email" };

  function actionButtons(list) {
    if (!list || !list.length) return null;
    const row = el("div", "bot-actions");
    list.forEach(([kind, arg]) => {
      if (kind === "resume" && !P.contact.resume) return;
      const label = kind === "go" ? "→ " + (SECTION_LABEL[arg] || arg) : ACTION_LABEL[kind] || kind;
      const b = el("button", "bot-act", label);
      b.type = "button";
      b.addEventListener("click", () => actions[kind] && actions[kind](arg));
      row.appendChild(b);
    });
    return row.childNodes.length ? row : null;
  }

  // ---------- chat log ----------
  const history = []; // [{role, content}] for the AI endpoint

  function addMsg(who, text, acts) {
    const m = el("div", "bot-msg from-" + who);
    const body = el("div", "bot-text");
    String(text).split(/\n+/).forEach((line, i) => {
      if (i) body.appendChild(el("br"));
      richText(body, line);
    });
    m.appendChild(body);
    const row = actionButtons(acts);
    if (row) m.appendChild(row);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }
  function say(text, acts) { history.push({ role: "assistant", content: text }); return addMsg("bot", text, acts); }

  function typing() {
    const t = el("div", "bot-msg from-bot typing");
    t.innerHTML = '<div class="bot-text"><i></i><i></i><i></i></div>';
    t.setAttribute("aria-label", BOT + " is typing");
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
    fab.classList.add("thinking");
    return () => { t.remove(); fab.classList.remove("thinking"); };
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

  // ---------- local knowledge ----------
  const techIndex = new Map(); // lowercase tech -> where it's used
  P.stack.forEach((g) => g.items.forEach(([name, note]) => {
    name.split("/").map((s) => s.trim()).forEach((n) => techIndex.set(n.toLowerCase(), { name: n, note, group: g.group }));
  }));
  P.projects.forEach((p) => p.stack.forEach((raw) => raw.split("/").map((s) => s.trim()).forEach((n) => {
    const k = n.toLowerCase();
    const cur = techIndex.get(k) || { name: n };
    (cur.projects = cur.projects || []).push(p.name);
    techIndex.set(k, cur);
  })));
  [...techIndex.keys()].forEach((k) => { if (k.endsWith(".js") && !techIndex.has(k.slice(0, -3))) techIndex.set(k.slice(0, -3), techIndex.get(k)); });

  function techAnswer(q) {
    const hits = [];
    techIndex.forEach((v, k) => {
      const key = k.replace(/[.+#]/g, (c) => "\\" + c);
      if (new RegExp("(^|\\s)" + key + "(\\s|$|js)").test(q.trim())) hits.push(v);
    });
    if (!hits.length) return null;
    const lines = hits.slice(0, 4).map((h) => {
      let s = "✔ " + h.name;
      if (h.note) s += " (" + h.note + ")";
      if (h.projects) s += ", used in " + listJoin(h.projects);
      return s;
    });
    return { text: "Yes! " + first + " works with:\n" + lines.join("\n"), acts: [["go", "stack"]] };
  }

  function projectAnswer(q) {
    const p = P.projects.find((x) => q.includes(" " + x.id.toLowerCase()) || q.includes(" " + x.name.toLowerCase())
      || (x.id === "asset-manager" && /\basset|device/.test(q)) || (x.id === "neakhatka" && /intern|hatkajob/.test(q)));
    if (!p) return null;
    const text = `${p.name}: ${p.summary}\nBuilt with ${listJoin(p.stack.slice(0, 6))}.\nHighlight: ${p.results[0]}.` +
      (p.links.repo ? "\nCode: " + p.links.repo : "");
    return { text, acts: [["go", "projects"]] };
  }

  const yrs = P.about.years_experience;
  const INTENTS = [
    { id: "greet", kw: ["hi", "hello", "hey", "yo", "sup", "good morning", "good afternoon"],
      a: () => ({ text: `Hey there! 👋 I'm ${BOT}. Ask me anything about ${first}: projects, skills, experience, or how to get in touch.` }) },
    { id: "projects", kw: ["project", "projects", "built", "build", "work on", "portfolio", "showcase", "made", "demo"],
      a: () => ({ text: `${first} has ${P.projects.length} featured projects:\n` + P.projects.map((p) => `• ${p.name}: ${p.summary}`).join("\n") + "\nAsk me about either one for details.", acts: [["go", "projects"]] }) },
    { id: "stack", kw: ["stack", "tech", "technology", "skills", "skill", "language", "languages", "tools", "framework", "database", "cloud", "devops", "know"],
      a: () => ({ text: "Here's the toolbox:\n" + P.stack.map((g) => `• ${g.group}: ${g.items.map((i) => i[0]).join(", ")}`).join("\n"), acts: [["go", "stack"]] }) },
    { id: "experience", kw: ["experience", "job", "jobs", "career", "work history", "company", "companies", "worked", "employ", "education", "study", "university", "degree"],
      a: () => ({ text: "Career log:\n" + P.experience.map((e) => `• ${e.date}: ${e.role} @ ${e.org}`).join("\n"), acts: [["go", "log"]] }) },
    { id: "hire", kw: ["hire", "hiring", "available", "availability", "open to work", "opportunity", "freelance", "remote", "position", "role", "recruit", "interview"],
      a: () => ({ text: P.about.open_to_work
        ? `Good news: ${first} is open to new opportunities! 🎉 The fastest way is email: ${P.contact.email}`
        : `${first} isn't actively looking right now, but you can still reach out: ${P.contact.email}`, acts: [["email"], ["go", "contact"], ["resume"]] }) },
    { id: "contact", kw: ["contact", "email", "mail", "reach", "message", "talk", "connect", "linkedin", "phone"],
      a: () => ({ text: `You can reach ${first} at ${P.contact.email}` + (P.contact.github ? `\nGitHub: ${P.contact.github}` : "") + "\nOr use the form in /contact.", acts: [["email"], ["go", "contact"]] }) },
    { id: "resume", kw: ["resume", "cv", "curriculum", "pdf"],
      a: () => P.contact.resume ? { text: "Here's the resume. One click and it's yours.", acts: [["resume"]] } : { text: "The resume isn't posted yet. Try the contact form!", acts: [["go", "contact"]] } },
    { id: "about", kw: ["who", "about", "yourself", "himself", "herself", "background", "introduce", "who is", "summary"],
      a: () => ({ text: `${P.name} is a ${P.role} based in ${P.location}${yrs ? " with " + yrs + "+ years of experience" : ""}.\n${P.about.bio[0]}\nFocus areas: ${listJoin(P.about.focus)}.`, acts: [["go", "about"]] }) },
    { id: "location", kw: ["where", "location", "based", "live", "country", "city", "timezone"],
      a: () => ({ text: `${first} is based in ${P.location} (UTC+7).` }) },
    { id: "github", kw: ["github", "repo", "repos", "code", "source", "open source", "commits"],
      a: () => ({ text: `${first}'s code lives at ${P.contact.github}. The /github section shows live stats.`, acts: [["go", "github"]] }) },
    { id: "bot", kw: ["you", "your name", "are you", "bot", "robot", "ai"],
      a: () => ({ text: `I'm ${BOT}, ${first}'s pocket-sized robot assistant. 🤖 ${ENDPOINT ? "I run on Claude and only know about " + first + "." : "I know everything on this page."}` }) },
    { id: "thanks", kw: ["thanks", "thank you", "thx", "cool", "nice", "awesome", "great", "bye", "goodbye"],
      a: () => ({ text: "Anytime! Beep boop. 🤖 I'll be right here in the corner." }) },
  ];

  function localAnswer(raw) {
    const q = norm(raw);
    const proj = projectAnswer(q);
    if (proj) return proj;
    let best = null, score = 0;
    INTENTS.forEach((it) => {
      let s = 0;
      it.kw.forEach((k) => { if (q.includes(" " + k + " ") || (k.length > 4 && q.includes(" " + k))) s += k.includes(" ") ? 2 : 1; });
      if (it.id === "bot" || it.id === "greet") s *= 0.5; // weak signals; let topical intents win ties
      if (s > score) { score = s; best = it; }
    });
    if (!best || best.id === "stack" || best.id === "bot") {
      const t = techAnswer(q);
      if (t) return t;
    }
    if (best) return best.a();
    return null;
  }

  const FALLBACK = () => ({
    text: `Hmm, I don't have an answer for that one. 🤔 I'm best at questions about ${first}'s projects, skills, experience, and contact info. For anything else, ${first} is happy to answer directly.`,
    acts: [["email"], ["go", "contact"]],
  });

  // ---------- AI endpoint ----------
  const SECTION_TAG = /\[\[go:([a-z]+)\]\]/g;
  async function askAI() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || typeof data.reply !== "string" || !data.reply.trim()) throw new Error("empty");
      const acts = [];
      const text = data.reply.replace(SECTION_TAG, (_, id) => {
        if (SECTIONS.includes(id) && !acts.some((a) => a[1] === id)) acts.push(["go", id]);
        return "";
      }).trim();
      return { text, acts };
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- conversation ----------
  let busy = false;
  async function ask(raw) {
    const q = raw.trim().slice(0, 500);
    if (!q || busy) return;
    busy = true;
    addMsg("user", q);
    history.push({ role: "user", content: q });
    const stop = typing();
    let ans = null;
    const local = localAnswer(q);
    if (ENDPOINT) {
      try { ans = await askAI(); } catch (e) { ans = local || FALLBACK(); }
    } else {
      await wait(450 + Math.random() * 400);
      ans = local || FALLBACK();
    }
    stop();
    say(ans.text, ans.acts);
    busy = false;
  }

  const CHIPS = [
    ["👋 Who is " + first + "?", "Who is " + first + "?"],
    ["Projects", "What projects has " + first + " built?"],
    ["Tech stack", "What is the tech stack?"],
    ["Experience", "Tell me about the experience"],
    ["Open to work?", "Is " + first + " open to work?"],
    ["Resume", "Can I get the resume?"],
  ];
  CHIPS.forEach(([label, q]) => {
    const b = el("button", "bot-chip", label);
    b.type = "button";
    b.addEventListener("click", () => ask(q));
    chipsEl.appendChild(b);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    ask(v);
  });

  // ---------- open / close ----------
  let greeted = false;
  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    wrap.classList.toggle("open", open);
    if (open) {
      hideBubble();
      if (!greeted) {
        greeted = true;
        say(`Hi! I'm ${BOT}, ${first}'s robot assistant. 🤖\nAsk me anything about ${first}, or tap a suggestion below.`);
      }
      if (!matchMedia("(pointer: coarse)").matches) input.focus();
    } else {
      fab.focus({ preventScroll: true });
    }
  }
  fab.addEventListener("click", () => setOpen(panel.hidden));
  panel.querySelector(".bot-close").addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } });

  // ---------- speech bubble ----------
  let bubbleTimer = 0, lastBubble = 0;
  const muted = () => store.get("muted") === "1";
  function showBubble(text, ms = 7000) {
    if (!panel.hidden || muted() || root.classList.contains("boot-on")) return;
    bubbleText.textContent = text;
    bubble.hidden = false;
    lastBubble = Date.now();
    fab.classList.add("wave");
    setTimeout(() => fab.classList.remove("wave"), 1200);
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => hideBubble(), ms);
  }
  function hideBubble() { bubble.hidden = true; clearTimeout(bubbleTimer); }
  bubble.addEventListener("click", (e) => {
    if (e.target.closest(".bot-bubble-x")) { store.set("muted", "1"); hideBubble(); return; }
    setOpen(true);
  });

  // greeting once per session, after the boot intro
  function waitBoot(cb) {
    if (!root.classList.contains("boot-on")) return cb();
    const mo = new MutationObserver(() => { if (!root.classList.contains("boot-on")) { mo.disconnect(); cb(); } });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  }
  waitBoot(() => {
    setTimeout(() => {
      if (store.get("greeted")) return;
      store.set("greeted", "1");
      showBubble(`Hi! I'm ${BOT} 👋 Got questions about ${first}? Ask me!`, 9000);
    }, 4500);
  });

  // react (lightly) when visitors reach key sections
  const REACT = {
    projects: "Ooh, the good stuff. 👀 Ask me about any project!",
    stack: "Wondering if " + first + " knows a tool? Just ask me.",
    contact: P.about.open_to_work ? first + " is open to work. Want the email? 📬" : "Want " + first + "'s email? I can copy it.",
  };
  if ("IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const id = en.target.id;
      if (!en.isIntersecting || seen.has(id) || !store.get("greeted")) return;
      seen.add(id);
      if (store.get("react:" + id) || Date.now() - lastBubble < 20000) return;
      store.set("react:" + id, "1");
      showBubble(REACT[id], 6000);
    }), { threshold: 0.35 });
    Object.keys(REACT).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ---------- eyes follow the cursor, blink ----------
  const eyes = wrap.querySelectorAll(".bot-fab .bot-eyes, .bot-mini .bot-eyes");
  if (!reduceMotion) {
    let tx = 0, ty = 0, raf = 0;
    addEventListener("pointermove", (e) => {
      const r = fab.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300);
      tx = (dx / d) * 3.2 * k; ty = (dy / d) * 2.4 * k;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; eyes.forEach((g) => g.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`)); });
    }, { passive: true });
    (function blink() {
      setTimeout(() => { wrap.classList.add("blink"); setTimeout(() => { wrap.classList.remove("blink"); blink(); }, 140); }, 2500 + Math.random() * 4000);
    })();
  }
})();
