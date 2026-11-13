// Bit: a small, lively assistant robot for the portfolio.
// - Flies after the cursor (spring physics), leans into turns, stops when you reach for it.
// - Tour guide: flies next to each section heading as the visitor scrolls and explains it.
// - Moods: happy on hover, surprised on fast scroll, talks while speaking, falls asleep when idle.
// - Chat: answers from window.PORTFOLIO, or an AI endpoint (worker/) when configured.
(() => {
  "use strict";
  const P = window.PORTFOLIO;
  if (!P) return;

  const cfg = P.assistant || {};
  const BOT = cfg.name || "Bit";
  const ENDPOINT = (cfg.endpoint || "").trim();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const root = document.documentElement;
  const first = (P.name || "").split(" ").slice(-1)[0] || P.name; // "Visal"

  const session = {
    get(k) { try { return sessionStorage.getItem("bot:" + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem("bot:" + k, v); } catch (e) {} },
  };
  const prefs = {
    get(k, d) { try { const v = localStorage.getItem("bot:" + k); return v == null ? d : v === "1"; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("bot:" + k, v ? "1" : "0"); } catch (e) {} },
  };

  // ---------- robot drawing ----------
  const robotSVG = (full) => `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      ${full ? `<g class="b-flame"><path d="M27 59 Q32 74 37 59 Z" class="b-flame-out"/><path d="M29.5 59 Q32 67 34.5 59 Z" class="b-flame-in"/></g>` : ""}
      <g class="b-rig">
        ${full ? `<path d="M23 53 L15 58" class="b-arm b-arm-l"/><path d="M41 53 L49 58" class="b-arm b-arm-r"/>` : ""}
        <rect x="22" y="50" width="20" height="9" rx="4" class="b-body"/>
        <g class="b-head">
          <line x1="32" y1="5" x2="32" y2="14" class="b-stroke"/>
          <circle cx="32" cy="5" r="3.2" class="b-antenna"/>
          <rect x="10" y="14" width="44" height="34" rx="11" class="b-skull"/>
          <rect x="15.5" y="21" width="33" height="19" rx="7" class="b-visor"/>
          <g class="b-eyes">
            <ellipse cx="25" cy="30.5" rx="3.6" ry="4.2" class="b-eye"/>
            <ellipse cx="39" cy="30.5" rx="3.6" ry="4.2" class="b-eye"/>
            <path d="M21.5 32 q3.5 -5 7 0 M35.5 32 q3.5 -5 7 0" class="b-eye-happy"/>
          </g>
          <path d="M27 44 q5 3 10 0" class="b-stroke b-mouth b-mouth-smile"/>
          <ellipse cx="32" cy="44.5" rx="2.4" ry="2.2" class="b-mouth b-mouth-o"/>
          <rect x="5" y="25" width="5" height="12" rx="2.5" class="b-ear"/>
          <rect x="54" y="25" width="5" height="12" rx="2.5" class="b-ear"/>
        </g>
      </g>
      ${full ? `<g class="b-zzz"><text x="50" y="12">z</text><text x="56" y="4">z</text></g>` : ""}
    </svg>`;

  // ---------- DOM ----------
  const bot = document.createElement("div");
  bot.className = "bot";
  bot.innerHTML = `
    <div class="bot-bubble" id="bot-bubble" hidden>
      <p class="bot-bubble-text" id="bot-bubble-text"></p>
      <div class="bot-actions" id="bot-bubble-acts"></div>
      <button class="bot-bubble-x" type="button" aria-label="Close tip">×</button>
    </div>
    <button class="bot-fab" id="bot-fab" type="button" aria-expanded="false" aria-controls="bot-panel"
      aria-label="Chat with ${BOT}, the portfolio assistant">${robotSVG(true)}</button>`;

  const panel = document.createElement("section");
  panel.className = "bot-panel";
  panel.id = "bot-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", BOT + ", portfolio assistant");
  panel.innerHTML = `
    <header class="bot-panel-head">
      <span class="bot-mini">${robotSVG(false)}</span>
      <span class="bot-title"><strong>${BOT}</strong><span class="c-dim small"> · ${ENDPOINT ? "AI assistant" : "assistant"}</span></span>
      <span class="bot-toggles">
        ${finePointer && !reduceMotion ? `<button class="bot-toggle" type="button" data-pref="follow" title="Follow your cursor">🐾 follow</button>` : ""}
        <button class="bot-toggle" type="button" data-pref="tour" title="Explain each section as you scroll">🧭 tour</button>
      </span>
      <button class="bot-close" type="button" aria-label="Close chat">×</button>
    </header>
    <div class="bot-log" id="bot-log" role="log" aria-live="polite"></div>
    <div class="bot-chips" id="bot-chips" aria-label="Suggested questions"></div>
    <form class="bot-form" id="bot-form" autocomplete="off">
      <span class="t-prompt" aria-hidden="true">&gt;</span>
      <input id="bot-in" type="text" maxlength="500" placeholder="Ask about ${first}…" aria-label="Ask ${BOT} a question">
      <button type="submit" aria-label="Send">↵</button>
    </form>`;

  document.body.append(panel, bot);

  const $ = (id) => document.getElementById(id);
  const fab = $("bot-fab"), log = $("bot-log"), chipsEl = $("bot-chips"), form = $("bot-form"), input = $("bot-in");
  const bubble = $("bot-bubble"), bubbleText = $("bot-bubble-text"), bubbleActs = $("bot-bubble-acts");

  // ---------- helpers ----------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const norm = (s) => " " + s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ") + " ";
  const listJoin = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // =====================================================================
  //  BODY: position, spring physics, moods
  // =====================================================================
  const pos = { x: -120, y: innerHeight - 90, vx: 0, vy: 0 }; // starts off-screen, flies in
  const cursor = { x: -1, y: -1, inside: false, t: 0 };
  let mode = "home";      // home | follow | guide
  let guideTarget = null; // () => {x, y} | null
  let raf = 0, lastFrame = 0;
  let size = 64;
  let lookAt = null;      // {x, y} the eyes look at

  const followOn = () => finePointer && !reduceMotion && prefs.get("follow", true);
  const tourOn = () => prefs.get("tour", true) && session.get("tour-off") !== "1";

  function home() {
    const m = innerWidth <= 600 ? 12 : 16;
    return { x: m, y: innerHeight - size - m };
  }

  function target() {
    if (!panel.hidden || bot.classList.contains("sleepy")) return home();
    if (mode === "guide" && guideTarget) {
      const t = guideTarget();
      if (t) return t;
    }
    if (mode === "follow" && cursor.inside) {
      // Hover beside the cursor, on the side we're already on; stop when the visitor reaches for us.
      const cx = pos.x + size / 2, cy = pos.y + size / 2;
      const dx = cx - cursor.x, dy = cy - cursor.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 84) return { x: pos.x, y: pos.y };
      const keep = 96;
      return { x: cursor.x + (dx / d) * keep - size / 2, y: cursor.y + (dy / d) * keep - size / 2 };
    }
    if (mode === "follow") return { x: pos.x, y: pos.y };
    return home();
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(30, lastFrame ? (now - lastFrame) / 16.67 : 1);
    lastFrame = now;
    size = fab.offsetWidth || 64;

    let t = target();
    t = { x: clamp(t.x, 8, innerWidth - size - 8), y: clamp(t.y, 64, innerHeight - size - 8) };

    if (reduceMotion) {
      pos.x = t.x; pos.y = t.y; pos.vx = pos.vy = 0;
    } else {
      // Fixed 60fps sub-steps keep the spring stable even when the browser throttles frames.
      // Slightly under-damped: a small, lively overshoot, never a fling.
      const k = mode === "guide" ? 0.05 : 0.035, damp = mode === "guide" ? 0.7 : 0.74;
      for (let i = 0, n = Math.max(1, Math.round(dt)); i < n; i++) {
        pos.vx = (pos.vx + (t.x - pos.x) * k) * damp;
        pos.vy = (pos.vy + (t.y - pos.y) * k) * damp;
        pos.x += pos.vx;
        pos.y += pos.vy;
      }
      const maxX = innerWidth - size - 8, maxY = innerHeight - size - 8;
      if (pos.x < 8 || pos.x > maxX) { pos.x = clamp(pos.x, 8, maxX); pos.vx = 0; }
      if (pos.y < 64 || pos.y > maxY) { pos.y = clamp(pos.y, 64, maxY); pos.vy = 0; }
    }

    const speed = Math.hypot(pos.vx, pos.vy);
    const tilt = clamp(pos.vx * 1.6, -22, 22);
    bot.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    bot.style.setProperty("--tilt", tilt.toFixed(1) + "deg");
    bot.classList.toggle("flying", speed > 2.2);
    placeBubble();
    aimEyes();

    const settled = speed < 0.05 && Math.abs(t.x - pos.x) < 0.5 && Math.abs(t.y - pos.y) < 0.5;
    if (!settled || mode === "guide") raf = requestAnimationFrame(frame);
    else lastFrame = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  // eyes
  const eyeGroups = document.querySelectorAll(".bot .b-eyes");
  function aimEyes() {
    if (reduceMotion) return;
    const p = lookAt || (cursor.inside ? cursor : null);
    let tx = 0, ty = 0;
    if (p) {
      const dx = p.x - (pos.x + size / 2), dy = p.y - (pos.y + size / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
      tx = (dx / d) * 3.4 * k; ty = (dy / d) * 2.6 * k;
    }
    eyeGroups.forEach((g) => g.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`));
  }

  // moods: happy | surprised | (none). Talking and sleepy are separate classes.
  let moodTimer = 0;
  function mood(name, ms = 1200) {
    bot.classList.remove("mood-happy", "mood-surprised");
    if (name) bot.classList.add("mood-" + name);
    clearTimeout(moodTimer);
    if (name && ms) moodTimer = setTimeout(() => bot.classList.remove("mood-" + name), ms);
  }
  function hop(kind = "hop") {
    if (reduceMotion) return;
    fab.classList.remove("hop", "wave"); void fab.offsetWidth; fab.classList.add(kind);
    setTimeout(() => fab.classList.remove(kind), 900);
  }

  // blinking
  if (!reduceMotion) {
    (function blink() {
      setTimeout(() => {
        if (!bot.classList.contains("sleepy")) {
          bot.classList.add("blink");
          setTimeout(() => bot.classList.remove("blink"), 130);
        }
        blink();
      }, 2200 + Math.random() * 3800);
    })();
  }

  // sleep after a while with no activity; wake up on any input
  let idleTimer = 0;
  function activity() {
    if (bot.classList.contains("sleepy")) {
      bot.classList.remove("sleepy");
      mood("surprised", 500);
      hop();
      kick();
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!panel.hidden || !bubble.hidden) return activity();
      bot.classList.add("sleepy");
      hideBubble();
      kick();
    }, 40000);
  }

  // cursor tracking
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    cursor.x = e.clientX; cursor.y = e.clientY; cursor.inside = true;
    activity();
    if (mode === "follow" || !reduceMotion) kick();
  }, { passive: true });
  document.addEventListener("pointerleave", () => { cursor.inside = false; kick(); });
  addEventListener("blur", () => { cursor.inside = false; });
  addEventListener("keydown", activity, { passive: true });
  addEventListener("touchstart", activity, { passive: true });
  addEventListener("resize", kick, { passive: true });

  fab.addEventListener("pointerenter", () => { if (!bot.classList.contains("sleepy")) { mood("happy", 0); hop(); } });
  fab.addEventListener("pointerleave", () => mood(null));

  // =====================================================================
  //  SPEECH BUBBLE
  // =====================================================================
  let speakId = 0, bubbleTimer = 0, bubbleKind = "";
  function placeBubble() {
    if (bubble.hidden) return;
    const above = pos.y > 190;
    const left = pos.x + size / 2 < innerWidth / 2;
    bubble.classList.toggle("below", !above);
    bubble.classList.toggle("right", !left);
  }

  async function speak(text, { acts = [], ms, kind = "tip" } = {}) {
    if (!panel.hidden || bot.classList.contains("sleepy") || root.classList.contains("boot-on")) return false;
    const id = ++speakId;
    bubbleKind = kind;
    clearTimeout(bubbleTimer);
    bubbleText.textContent = "";
    bubbleActs.textContent = "";
    bubbleActs.hidden = true;
    bubble.hidden = false;
    placeBubble();
    mood("happy", 900);

    if (reduceMotion) {
      bubbleText.textContent = text;
    } else {
      bot.classList.add("talking");
      for (let i = 0; i < text.length; i++) {
        if (id !== speakId) return false;
        bubbleText.textContent += text[i];
        bot.classList.toggle("mouth-open", i % 4 < 2 && /\S/.test(text[i]));
        await sleep(/[.!?]/.test(text[i]) ? 140 : 22);
      }
      bot.classList.remove("talking", "mouth-open");
    }
    if (id !== speakId) return false;
    acts.forEach(([label, fn]) => {
      const b = el("button", "bot-act", label);
      b.type = "button";
      b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      bubbleActs.appendChild(b);
    });
    bubbleActs.hidden = !acts.length;
    placeBubble();
    bubbleTimer = setTimeout(() => { if (id === speakId) hideBubble(); }, ms || 3500 + text.length * 40);
    return true;
  }

  function hideBubble() {
    speakId++;
    clearTimeout(bubbleTimer);
    bubble.hidden = true;
    bot.classList.remove("talking", "mouth-open");
    if (mode === "guide") endGuide();
  }

  bubble.addEventListener("click", (e) => {
    if (e.target.closest(".bot-bubble-x")) {
      // Closing a tour tip means "stop the tour" for this visit.
      if (bubbleKind === "tour") session.set("tour-off", "1");
      hideBubble();
      return;
    }
    if (!e.target.closest(".bot-act")) setOpen(true);
  });

  // =====================================================================
  //  TOUR GUIDE
  // =====================================================================
  const toolCount = P.stack.reduce((n, g) => n + g.items.length, 0);
  const latest = P.experience[0];
  const GUIDE = {
    about: {
      text: `This is /about. TL;DR: ${P.role.toLowerCase()} in ${P.location.split(",")[0]}, ${P.about.years_experience}+ years, into ${listJoin(P.about.focus)}.`,
      acts: [["Tell me more", () => openAndAsk("Who is " + first + "?")]],
    },
    projects: {
      text: `${P.projects.length} projects live here. Click "$ cat case-study.md" on a card to see the problem, results, and a live request trace! 🔍`,
      acts: [["Summarize them", () => openAndAsk("What projects has " + first + " built?")]],
    },
    stack: {
      text: `The toolbox: ${toolCount} tools in production. Curious about one? Ask me "do you know Docker?"`,
      acts: [["Ask about a tool", () => setOpen(true)]],
    },
    github: {
      text: "These stats are pulled live from GitHub's API. Real numbers, no copy-paste. 📡",
      acts: [],
    },
    log: {
      text: latest ? `Career history, written as a git log. Latest commit: ${latest.role} @ ${latest.org}.` : "Career history, written as a git log.",
      acts: [["Full history", () => openAndAsk("Tell me about the work experience")]],
    },
    contact: {
      text: P.about.open_to_work
        ? `${first} is open to work! 🎉 Send a request with this form, or I can copy the email for you.`
        : `Want to say hi? Send a request with this form, or I can copy the email for you.`,
      acts: [["Copy email", () => actions.email(true)]],
    },
  };
  const sections = Object.keys(GUIDE).map((id) => document.getElementById(id)).filter(Boolean);

  // Where Bit hovers while presenting a section: in the left gutter beside the heading if there's room.
  function guideSpot(section) {
    const head = section.querySelector(".endpoint") || section;
    return () => {
      const r = head.getBoundingClientRect();
      if (r.bottom < 60 || r.top > innerHeight) return null;
      const sr = section.getBoundingClientRect();
      const padL = parseFloat(getComputedStyle(section).paddingLeft) || 0;
      const contentLeft = sr.left + padL;
      lookAt = { x: r.left + 120, y: r.top + r.height / 2 };
      if (contentLeft >= size + 28) return { x: contentLeft - size - 18, y: r.top + r.height / 2 - size / 2 };
      return null; // narrow screen: stay put and talk from where we are
    };
  }

  let guiding = null;
  async function guide(section) {
    if (guiding === section.id) return;
    const g = GUIDE[section.id];
    guiding = section.id;
    session.set("seen:" + section.id, "1");
    mode = "guide";
    guideTarget = guideSpot(section);
    kick();
    await sleep(reduceMotion ? 0 : 450); // let it fly there first
    if (guiding !== section.id) return;
    hop("wave");
    const ok = await speak(g.text, { kind: "tour", acts: g.acts.map(([l, fn]) => [l, () => { hideBubble(); fn(); }]) });
    if (!ok && guiding === section.id) endGuide();
  }
  function endGuide() {
    guiding = null;
    guideTarget = null;
    lookAt = null;
    mode = followOn() ? "follow" : "home";
    kick();
  }

  // Pick the section whose heading sits in the upper part of the screen once scrolling settles.
  let settleTimer = 0, lastY = scrollY, lastT = performance.now();
  addEventListener("scroll", () => {
    const now = performance.now();
    const v = Math.abs(scrollY - lastY) / Math.max(1, now - lastT) * 1000;
    lastY = scrollY; lastT = now;
    activity();
    if (v > 4000 && !bot.classList.contains("mood-surprised")) mood("surprised", 700);
    if (guiding) {
      const s = document.getElementById(guiding);
      const r = s && s.getBoundingClientRect();
      if (!r || r.bottom < innerHeight * 0.25 || r.top > innerHeight * 0.75) hideBubble();
    }
    kick();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(pickSection, 380);
  }, { passive: true });

  function pickSection() {
    if (!tourOn() || !panel.hidden || !greeted || root.classList.contains("boot-on")) return;
    const s = sections.find((sec) => {
      const r = sec.getBoundingClientRect();
      return r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.45;
    });
    if (!s || session.get("seen:" + s.id) || guiding === s.id) return;
    guide(s);
  }

  // =====================================================================
  //  CHAT
  // =====================================================================
  const SECTIONS = ["about", "projects", "stack", "github", "log", "contact"];
  const SECTION_LABEL = { about: "/about", projects: "/projects", stack: "/stack", github: "/github", log: "/log", contact: "/contact" };

  const actions = {
    go(id) {
      const t = document.getElementById(id);
      if (!t) return;
      session.set("seen:" + id, "1"); // they asked to go there; no need to narrate
      if (matchMedia("(max-width: 600px)").matches) setOpen(false);
      t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      t.classList.remove("bot-flash"); void t.offsetWidth; t.classList.add("bot-flash");
    },
    resume() {
      if (!P.contact.resume) return;
      const a = el("a"); a.href = P.contact.resume; a.download = ""; document.body.appendChild(a); a.click(); a.remove();
    },
    async email(viaBubble) {
      let ok = true;
      try { await navigator.clipboard.writeText(P.contact.email); } catch (e) { ok = false; }
      const msg = ok ? "Copied " + P.contact.email + " to your clipboard. 📋" : "Here it is: " + P.contact.email;
      if (viaBubble && panel.hidden) { mood("happy"); hop(); speak(msg, { kind: "info", ms: 4000 }); }
      else say(msg);
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
    bot.classList.add("thinking");
    return () => { t.remove(); bot.classList.remove("thinking"); };
  }
  const wait = (ms) => sleep(reduceMotion ? 0 : ms);

  // ---------- local knowledge ----------
  const techIndex = new Map();
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
      if (new RegExp("(^|\\s)" + key + "(\\s|$|js)").test(q.trim()) && !hits.includes(v)) hits.push(v);
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
      a: () => ({ text: "Anytime! Beep boop. 🤖 I'll be right here." }) },
  ];

  function localAnswer(raw) {
    const q = norm(raw);
    const proj = projectAnswer(q);
    if (proj) return proj;
    let best = null, score = 0;
    INTENTS.forEach((it) => {
      let s = 0;
      it.kw.forEach((k) => { if (q.includes(" " + k + " ") || (k.length > 4 && q.includes(" " + k))) s += k.includes(" ") ? 2 : 1; });
      if (it.id === "bot" || it.id === "greet") s *= 0.5;
      if (s > score) { score = s; best = it; }
    });
    if (!best || best.id === "stack" || best.id === "bot") {
      const t = techAnswer(q);
      if (t) return t;
    }
    return best ? best.a() : null;
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
    ["Experience", "Tell me about the work experience"],
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
  let chatGreeted = false;
  function setOpen(open) {
    if (open) {
      hideBubble();
      if (guiding) endGuide();
    }
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    bot.classList.toggle("open", open);
    kick(); // fly home next to the panel (or back to following)
    if (open) {
      bot.classList.remove("sleepy");
      if (!chatGreeted) {
        chatGreeted = true;
        say(`Hi! I'm ${BOT}, ${first}'s robot assistant. 🤖\nAsk me anything about ${first}, or tap a suggestion below.`);
      }
      if (!matchMedia("(pointer: coarse)").matches) input.focus();
    } else {
      fab.focus({ preventScroll: true });
    }
  }
  function openAndAsk(q) { setOpen(true); ask(q); }

  fab.addEventListener("click", () => setOpen(panel.hidden));
  panel.querySelector(".bot-close").addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } });

  // follow / tour toggles
  const toggles = panel.querySelectorAll(".bot-toggle");
  function syncToggles() {
    toggles.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pref === "follow" ? followOn() : tourOn())));
  }
  toggles.forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.pref === "follow") {
      prefs.set("follow", !followOn());
      if (!guiding) mode = followOn() ? "follow" : "home";
    } else {
      const on = !tourOn();
      prefs.set("tour", on);
      session.set("tour-off", on ? "0" : "1");
    }
    syncToggles();
    kick();
  }));
  syncToggles();

  // =====================================================================
  //  ENTRANCE
  // =====================================================================
  let greeted = false;
  function waitBoot(cb) {
    if (!root.classList.contains("boot-on")) return cb();
    const mo = new MutationObserver(() => { if (!root.classList.contains("boot-on")) { mo.disconnect(); cb(); } });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  }
  waitBoot(async () => {
    await sleep(900);
    mode = followOn() ? "follow" : "home";
    if (reduceMotion) { const h = home(); pos.x = h.x; pos.y = h.y; }
    kick();
    activity();
    await sleep(reduceMotion ? 0 : 900);
    hop("wave");
    if (!session.get("greeted")) {
      session.set("greeted", "1");
      await speak(
        tourOn()
          ? `Hi! I'm ${BOT} 👋 I'll be your guide. Scroll down and I'll explain each section, or click me to chat!`
          : `Hi! I'm ${BOT} 👋 Got questions about ${first}? Click me!`,
        { kind: "greet", ms: 7000 },
      );
    }
    greeted = true;
    setTimeout(pickSection, 7500); // in case the page was opened mid-scroll
  });
})();
