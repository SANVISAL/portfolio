(() => {
  "use strict";

  const D = window.PORTFOLIO;
  const $ = (sel, el = document) => el.querySelector(sel);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // JSON.stringify output with syntax colors. Quotes stay literal so the regex can find strings.
  function highlight(obj) {
    const raw = JSON.stringify(obj, null, 2).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    return raw.replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g,
      (m, str, colon, kw, num) => {
        if (str) return colon ? `<span class="j-key">${str}</span>${colon}` : `<span class="j-str">${str}</span>`;
        if (kw) return `<span class="j-kw">${kw}</span>`;
        return `<span class="j-num">${num}</span>`;
      }
    );
  }

  const mailto = (subject = "", body = "") =>
    `mailto:${D.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  /* ---------- boot intro (once per session; decided in <head>) ---------- */
  const booted = (async () => {
    const root = document.documentElement;
    if (!root.classList.contains("boot-on")) return;
    try { sessionStorage.setItem("booted", "1"); } catch (e) {}
    const log = $("#boot-log");
    let skip = false;
    const onSkip = () => (skip = true);
    addEventListener("keydown", onSkip);
    addEventListener("pointerdown", onSkip);
    const dots = (label, w = 34) => esc(label) + " " + ".".repeat(Math.max(2, w - label.length)) + " ";
    const OK = `<span class="c-green">[  OK  ]</span>`;
    const lines = [
      `<span class="c-cyan">VISAL-BIOS</span> v${new Date().getFullYear()} · ${esc(D.location)}`,
      `<span class="c-dim">(c) ${esc(D.name)}. All rights reserved.</span>`,
      "",
      dots("memory check") + `<span class="c-green">OK</span>`,
      dots("mounting /projects") + `<span class="c-yellow">${D.projects.length} found</span>`,
      ...D.projects.map((p) => `${OK} started <span class="c-white">${esc(p.name)}.service</span>`),
      `${OK} started api-gateway.service`,
      `${OK} reached target <span class="c-magenta">portfolio</span>`,
      "",
      `${esc(D.handle)}@prod login: <span class="c-cyan">guest</span>`,
    ];
    for (const line of lines) {
      if (skip) break;
      log.innerHTML += line + "\n";
      await sleep(line ? rand(70, 150) : 60);
    }
    if (!skip) await sleep(350);
    removeEventListener("keydown", onSkip);
    removeEventListener("pointerdown", onSkip);
    $("#boot").classList.add("done");
    await sleep(450);
    root.classList.remove("boot-on");
  })();

  /* ---------- static bindings ---------- */
  document.querySelectorAll("[data-bind]").forEach((el) => (el.textContent = D[el.dataset.bind]));
  $("#year").textContent = new Date().getFullYear();

  /* ---------- hero: glitching name + stats ---------- */
  const heroName = $("#hero-name");
  heroName.dataset.text = D.name;
  function glitch() {
    if (reduceMotion || heroName.classList.contains("on")) return;
    heroName.classList.add("on");
    setTimeout(() => heroName.classList.remove("on"), 500);
  }
  heroName.addEventListener("mouseenter", glitch);
  (function loop() { setTimeout(() => { if (!document.hidden) glitch(); loop(); }, rand(3500, 7000)); })();

  const toolCount = D.stack.reduce((n, g) => n + g.items.length, 0);
  const STATS = [
    [D.projects.length, "", "projects"],
    [D.about.years_experience, "y", "experience"],
    [toolCount, "", "tools"],
  ];
  $("#hero-stats").innerHTML = STATS.map(([n, unit, label]) =>
    `<div><dt>${esc(label)}</dt><dd data-n="${n}" data-unit="${esc(unit)}">${n}${esc(unit)}</dd></div>`).join("");
  if (!reduceMotion) {
    document.querySelectorAll("#hero-stats dd").forEach(async (dd) => {
      const n = +dd.dataset.n;
      await booted;
      for (let i = 0; i <= n; i++) {
        dd.textContent = i + dd.dataset.unit;
        await sleep(900 / Math.max(n, 1));
      }
    });
  }

  /* ---------- tagline typing ---------- */
  (async () => {
    const el = $("#tagline");
    if (reduceMotion) return (el.textContent = D.tagline);
    await booted;
    await sleep(400);
    for (const ch of D.tagline) {
      el.textContent += ch;
      await sleep(ch === " " ? 30 : rand(35, 75));
    }
  })();

  /* ---------- about ---------- */
  $("#about-bio").innerHTML = D.about.bio.map((p) => `<p>${esc(p)}</p>`).join("");
  $("#about-json").innerHTML = highlight({
    name: D.name,
    role: D.role,
    location: D.location,
    years_experience: D.about.years_experience,
    focus: D.about.focus,
    open_to_work: D.about.open_to_work,
  });

  /* ---------- projects ---------- */
  const STATUS = {
    running: { label: "running", cls: "ok" },
    building: { label: "building", cls: "warn" },
    archived: { label: "archived", cls: "off" },
  };

  function archHTML(p) {
    const self = p.name.split("-")[0].toLowerCase();
    return p.architecture
      .map((n, i) => {
        const node = `<span class="node${n.toLowerCase().startsWith(self) ? " self" : ""}">${esc(n)}</span>`;
        return i === 0 ? node : `<span class="wire" style="--d:${(i * 0.25).toFixed(2)}s"></span>${node}`;
      })
      .join("");
  }

  $("#services").innerHTML = D.projects
    .map((p) => {
      const s = STATUS[p.status] || STATUS.running;
      const links = [
        p.links.repo && `<a href="${esc(p.links.repo)}" target="_blank" rel="noopener">→ source</a>`,
        p.links.demo && `<a href="${esc(p.links.demo)}" target="_blank" rel="noopener">→ live demo</a>`,
      ].filter(Boolean).join("");
      return `
      <article class="service" id="svc-${esc(p.id)}">
        <div class="svc-head">
          <span class="svc-status ${s.cls}"><span class="dot ${s.cls}${s.cls === "ok" ? " pulse" : ""}"></span>${s.label}</span>
          <span>${esc(p.version)}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p class="svc-desc">${esc(p.summary)}</p>
        <dl class="svc-metrics">${p.metrics.map((m) => `<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join("")}</dl>
        <ul class="badges">${p.stack.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <button class="svc-toggle" type="button" aria-expanded="false" aria-controls="cs-${esc(p.id)}">$ cat case-study.md</button>
        <div class="case" id="cs-${esc(p.id)}" hidden>
          <div><h4>// problem</h4><p>${esc(p.problem)}</p></div>
          <div><h4>// result</h4><ul class="results">${p.results.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
          <div class="arch-wrap"><h4>// architecture</h4><div class="arch">${archHTML(p)}</div><div class="arch-trace" aria-hidden="true"></div></div>
          ${links ? `<div class="case-links">${links}</div>` : ""}
        </div>
      </article>`;
    })
    .join("");

  function toggleCase(card, force) {
    const btn = $(".svc-toggle", card);
    const open = force ?? btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "$ close case-study.md" : "$ cat case-study.md";
    $(".case", card).hidden = !open;
    card.classList.toggle("open", open);
    card.classList.remove("tilting");
    card.style.transform = "";
    if (open) trace(card);
  }

  // Light up the architecture diagram hop by hop, like a request moving through the services.
  const tracing = new WeakSet();
  async function trace(card) {
    if (reduceMotion || tracing.has(card)) return;
    tracing.add(card);
    const nodes = [...card.querySelectorAll(".arch .node")];
    const wires = [...card.querySelectorAll(".arch .wire")];
    const label = $(".arch-trace", card);
    const reset = () => card.querySelectorAll(".arch .hit").forEach((el) => el.classList.remove("hit"));
    while (card.classList.contains("open")) {
      for (let i = 0; i < nodes.length && card.classList.contains("open"); i++) {
        if (i) wires[i - 1].classList.add("hit");
        nodes[i].classList.add("hit");
        label.innerHTML = `<span class="c-dim">trace</span> hop ${i + 1}/${nodes.length} → <span class="c-cyan">${esc(nodes[i].textContent)}</span>`;
        await sleep(550);
      }
      label.innerHTML += ` <span class="c-green">· 200 OK</span>`;
      await sleep(1500);
      reset();
      await sleep(350);
    }
    reset();
    label.textContent = "";
    tracing.delete(card);
  }
  $("#services").addEventListener("click", (e) => {
    const btn = e.target.closest(".svc-toggle");
    if (btn) toggleCase(btn.closest(".service"));
  });

  /* ---------- stack ---------- */
  $("#panels").innerHTML = D.stack
    .map((g) => `
      <div class="panel">
        <div class="panel-head"><b>${esc(g.group)}</b><span>${g.items.length} series</span></div>
        <ul>${g.items.map(([name, note]) => `<li><span>${esc(name)}</span><span>${esc(note)}</span></li>`).join("")}</ul>
      </div>`)
    .join("");

  /* ---------- experience ---------- */
  $("#gitlog").innerHTML = D.experience
    .map((e, i) => `
      <li class="commit">
        <div><span class="c-hash">commit ${esc(e.hash)}</span>${i === 0 ? ` <span class="c-ref">(<b>HEAD -&gt; main</b>)</span>` : ""}</div>
        <div class="c-meta">Date: ${esc(e.date)}</div>
        <div class="c-msg"><span class="c-type">${esc(e.type)}:</span> ${esc(e.role)} @ ${esc(e.org)}</div>
        <ul>${e.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>
      </li>`)
    .join("");

  /* ---------- contact ---------- */
  const handle = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  $("#contact-links").innerHTML = [
    ["email", D.contact.email && `mailto:${D.contact.email}`, D.contact.email],
    ["github", D.contact.github, D.contact.github && handle(D.contact.github)],
    ["linkedin", D.contact.linkedin, D.contact.linkedin && handle(D.contact.linkedin)],
  ]
    .filter(([, href]) => href)
    .map(([k, href, label]) => `<li><span class="method get">GET</span><span class="c-dim">/${k}</span><a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a></li>`)
    .join("");

  $("#contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const code = $("#contact-code");
    const bad = [...form.elements].filter((el) => el.name && !el.checkValidity());
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));

    if (bad.length) {
      bad.forEach((el) => el.classList.add("invalid"));
      bad[0].focus();
      code.className = "code bad";
      code.textContent = "422 Unprocessable Entity";
      $("#contact-json").innerHTML = highlight({
        error: "validation_failed",
        fields: bad.map((el) => el.name),
      });
      return;
    }

    const ms = rand(18, 64);
    code.className = "code created";
    code.innerHTML = `201 Created <span class="c-dim">· ${ms}ms</span>`;
    $("#contact-json").innerHTML = highlight({
      status: "queued",
      id: "msg_" + Math.random().toString(36).slice(2, 10),
      message: `Thanks ${data.name.trim().split(" ")[0]}, opening your mail client to deliver this.`,
    });
    window.location.href = mailto(`Hello from ${data.name}`, `${data.message}\n\n— ${data.name} <${data.email}>`);
  });

  /* ---------- terminal ---------- */
  const term = $("#term-body");
  const input = $("#term-in");
  const history = [];
  let hIdx = 0;
  let busy = false;

  function print(html, cls = "t-out") {
    const div = document.createElement("div");
    div.className = cls;
    div.innerHTML = html;
    term.appendChild(div);
    term.scrollTop = term.scrollHeight;
  }
  const jump = (id, label) => `<a href="#${id}" class="t-dim">↳ ${label || "scroll to /" + id}</a>`;

  const COMMANDS = {
    help: () =>
      [
        ["whoami", "who is this person"],
        ["ls projects", "list deployed services"],
        ["open <project>", "read a case study"],
        ["cat skills.json", "the stack"],
        ["git log", "work history"],
        ["curl /contact", "how to reach me"],
        ["clear", "clear the screen"],
      ]
        .map(([c, d]) => `  <span class="t-key">${c.padEnd(16)}</span><span class="t-dim">${d}</span>`)
        .join("\n") + `\n\n<span class="t-dim">  …and one sudo command that actually works.</span>`,

    whoami: () =>
      `<span class="t-ok">${esc(D.name)}</span> · ${esc(D.role)}\n<span class="t-dim">${esc(D.location)}</span>\n${esc(D.about.bio[0])}\n${jump("about")}`,

    ls: (args) => {
      if (args[0] && !["projects", "projects/", "services"].includes(args[0]))
        return `<span class="t-err">ls: ${esc(args[0])}: No such file or directory</span>\n<span class="t-dim">try: ls projects</span>`;
      const rows = D.projects.map((p) => {
        const s = STATUS[p.status] || STATUS.running;
        const color = s.cls === "ok" ? "t-ok" : s.cls === "warn" ? "t-warn" : "t-dim";
        return `<span class="${color}">●</span> <span class="t-key">${esc(p.name.padEnd(18))}</span><span class="t-dim">${esc(p.version.padEnd(13))}</span>${esc(p.stack.slice(0, 2).join(" · "))}`;
      });
      return rows.join("\n") + `\n<span class="t-dim">run: open ${esc(D.projects[0].id)}</span>`;
    },

    open: (args) => {
      const p = D.projects.find((x) => x.id === args[0] || x.name === args[0]);
      if (!p) return `<span class="t-err">open: unknown project '${esc(args[0] || "")}'</span>\n<span class="t-dim">available: ${D.projects.map((x) => esc(x.id)).join(", ")}</span>`;
      const card = document.getElementById("svc-" + p.id);
      toggleCase(card, true);
      setTimeout(() => card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 300);
      return `<span class="t-ok">✓</span> opening ${esc(p.name)} case study…`;
    },

    cat: (args) => {
      const f = args[0] || "";
      if (["skills.json", "stack.json"].includes(f)) {
        const obj = Object.fromEntries(D.stack.map((g) => [g.group, g.items.map(([n]) => n)]));
        return highlight(obj) + "\n" + jump("stack");
      }
      if (["about.txt", "readme.md", "README.md"].includes(f)) return D.about.bio.map(esc).join("\n\n");
      return `<span class="t-err">cat: ${esc(f || "missing operand")}: No such file</span>\n<span class="t-dim">try: cat skills.json</span>`;
    },

    git: (args) => {
      if (args[0] !== "log") return `<span class="t-err">git: '${esc(args[0] || "")}' is not a git command here.</span> <span class="t-dim">try: git log</span>`;
      return D.experience
        .map((e, i) => `<span class="t-warn">${esc(e.hash)}</span>${i === 0 ? ' <span class="t-key">(HEAD -&gt; main)</span>' : ""} ${esc(e.type)}: ${esc(e.role)} @ ${esc(e.org)} <span class="t-dim">${esc(e.date)}</span>`)
        .join("\n") + "\n" + jump("log");
    },

    curl: (args) => {
      const path = (args.find((a) => a.startsWith("/") || a.includes("contact")) || "").replace(/^https?:\/\/[^/]+/, "");
      if (path.includes("contact")) {
        return `<span class="t-ok">HTTP/1.1 200 OK</span>\n` +
          highlight({ email: D.contact.email, github: D.contact.github, linkedin: D.contact.linkedin }) + "\n" + jump("contact", "or POST /contact below");
      }
      if (path.includes("projects")) return COMMANDS.ls([]);
      if (path.includes("about")) return COMMANDS.whoami();
      return `<span class="t-err">curl: (404) Not Found</span>\n<span class="t-dim">try: curl /contact</span>`;
    },

    date: () => new Date().toString(),
    pwd: () => `/home/${esc(D.handle)}`,
    echo: (args, raw) => esc(raw.replace(/^echo\s*/i, "")),
    exit: () => `<span class="t-dim">logout… just kidding, the server stays up.</span>`,
    gui: () => { $("#about").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); return `<span class="t-dim">switching to GUI mode ↓</span>`; },
    clear: () => { term.innerHTML = ""; return null; },
  };

  function run(raw) {
    print(`<span class="t-prompt">visal@prod:~$</span> ${esc(raw)}`, "t-cmd");
    const cmd = raw.trim().replace(/\s+/g, " ");
    if (!cmd) return;
    history.push(cmd);
    hIdx = history.length;

    const lc = cmd.toLowerCase();
    if (/^sudo hire( me| visal)?$/.test(lc)) return hire();
    if (lc.startsWith("sudo")) {
      return print(`<span class="t-err">${esc(D.handle)} is not in the sudoers file. This incident will be reported.</span>\n<span class="t-dim">(hint: sudo hire me)</span>`);
    }
    const [name, ...args] = cmd.split(" ");
    const fn = COMMANDS[name.toLowerCase()];
    if (!fn) return print(`<span class="t-err">zsh: command not found: ${esc(name)}</span>\n<span class="t-dim">type 'help' to see what's available</span>`);
    const out = fn(args, cmd);
    if (out) print(out);
  }

  async function autoType(cmd) {
    if (busy) return;
    busy = true;
    input.value = "";
    for (const ch of cmd) {
      input.value += ch;
      if (!reduceMotion) await sleep(rand(30, 60));
    }
    await sleep(reduceMotion ? 0 : 180);
    input.value = "";
    run(cmd);
    busy = false;
  }

  $("#term-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) return;
    const v = input.value;
    input.value = "";
    run(v);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hIdx > 0) {
      input.value = history[--hIdx];
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      hIdx = Math.min(hIdx + 1, history.length);
      input.value = history[hIdx] || "";
      e.preventDefault();
    } else if (e.key === "Tab") {
      const v = input.value.toLowerCase();
      const all = [...Object.keys(COMMANDS), ...D.projects.map((p) => "open " + p.id), "ls projects", "cat skills.json", "git log", "curl /contact"];
      const hit = v && all.find((c) => c.startsWith(v));
      if (hit) input.value = hit;
      e.preventDefault();
    } else if (e.key === "l" && e.ctrlKey) {
      term.innerHTML = "";
      e.preventDefault();
    }
  });

  // Click empty space in the terminal to focus the prompt (without stealing text selection).
  term.addEventListener("click", (e) => {
    if (!e.target.closest("a") && !getSelection().toString()) input.focus({ preventScroll: true });
  });

  const CHIPS = ["whoami", "ls projects", "cat skills.json", "git log", "curl /contact", "sudo hire me"];
  $("#term-chips").innerHTML = CHIPS.map((c) => `<button type="button" class="chip${c.startsWith("sudo") ? " egg" : ""}">${esc(c)}</button>`).join("");
  $("#term-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) autoType(chip.textContent);
  });

  (async () => {
    const last = new Date(Date.now() - rand(2, 40) * 3600e3);
    print(`<span class="t-dim">Last login: ${last.toDateString()} ${last.toTimeString().slice(0, 8)} on ttys001</span>`);
    await booted;
    await sleep(reduceMotion ? 0 : 700);
    await autoType("whoami");
    print(`\n<span class="t-dim">Type a command (try</span> <span class="t-key">help</span><span class="t-dim">) or tap one below.</span>`);
  })();

  /* ---------- easter egg ---------- */
  const granted = $("#granted");
  let lastFocus = null;

  function hire() {
    print(`<span class="t-dim">[sudo] password for recruiter: ********</span>\n<span class="t-ok">✓ ACCESS GRANTED</span>`);
    lastFocus = document.activeElement;
    $("#granted-mail").href = mailto(`Let's talk: ${D.role} role`, "Hi Visal,\n\n");
    granted.hidden = false;
    $("#granted-close").focus();
    confetti();
  }
  function closeGranted() {
    granted.hidden = true;
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $("#granted-close").addEventListener("click", closeGranted);
  granted.addEventListener("click", (e) => { if (e.target === granted) closeGranted(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !granted.hidden) closeGranted(); });

  function confetti() {
    if (reduceMotion) return;
    const c = $("#confetti");
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#00f0ff", "#ff2bd6", "#39ff14", "#f5ff3b"];
    const parts = Array.from({ length: 180 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 120,
      y: H * 0.55,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 16 - 6,
      s: Math.random() * 6 + 5,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: pick(colors),
    }));
    const start = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 8;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (t - start < 3800) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(start);
  }

  /* ---------- live log stream ---------- */
  const logBox = $("#logstream");
  const logList = $("#log-lines");
  function setCollapsed(collapsed) {
    logBox.classList.toggle("collapsed", collapsed);
    $("#log-toggle").setAttribute("aria-expanded", !collapsed);
    if (!collapsed && !logList.children.length) for (let i = 0; i < 5; i++) addLog(true);
  }
  $("#log-toggle").addEventListener("click", () => setCollapsed(!logBox.classList.contains("collapsed")));

  const routes = ["/api/v1/invoices", "/api/v1/auth/token", "/api/v1/users/:id", "/healthz", "/api/v1/events", "/metrics"];
  const LOGS = [
    () => ["INFO", "lv-info", `${pick(D.projects).name} GET ${pick(routes)} 200 ${rand(4, 60)}ms`],
    () => ["INFO", "lv-info", `${pick(D.projects).name} POST ${pick(routes)} 201 ${rand(10, 90)}ms`],
    () => ["OK", "lv-ok", `healthcheck passed (${D.projects.length}/${D.projects.length} services)`],
    () => ["OK", "lv-ok", `${D.handle} deployed ${pick(D.projects).name} ${pick(D.projects).version}`],
    () => ["DEBUG", "lv-dbg", `cache hit ratio ${rand(92, 99)}.${rand(0, 9)}%`],
    () => ["INFO", "lv-info", `worker-${rand(1, 8)} processed ${rand(120, 2400)} jobs`],
    () => ["WARN", "lv-warn", `slow query ${rand(210, 480)}ms, index suggested`],
    () => ["INFO", "lv-info", `p99 latency ${rand(30, 120)}ms · error rate 0.0${rand(1, 9)}%`],
  ];

  function addLog(force) {
    if (!force && (document.hidden || logBox.classList.contains("collapsed"))) return;
    const [lvl, cls, msg] = pick(LOGS)();
    const li = document.createElement("li");
    li.innerHTML = `<span class="ts">${new Date().toTimeString().slice(0, 8)}</span> <span class="${cls}">[${lvl}]</span> ${esc(msg)}`;
    logList.appendChild(li);
    while (logList.children.length > 7) logList.firstElementChild.remove();
  }
  // Start collapsed unless there's room beside the content, and stay out of the way of the hero terminal.
  setCollapsed(innerWidth < 1900);
  new IntersectionObserver(([e]) => logBox.classList.toggle("away", e.isIntersecting)).observe($("#terminal"));
  setInterval(addLog, reduceMotion ? 5000 : 2200);

  /* ---------- scroll effects ---------- */
  const revealTargets = [
    ".endpoint", ".about-bio", "#about .response", ".service", ".panel", "#gh", ".commit", ".request", "#contact-response",
  ];
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealer.unobserve(e.target);
      setTimeout(() => e.target.style.setProperty("--rd", "0s"), 1200);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(revealTargets.join(",")).forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.matches(revealTargets.join(",")));
    el.style.setProperty("--rd", `${Math.min(siblings.indexOf(el), 4) * 0.08}s`);
    el.classList.add("reveal");
    if (reduceMotion) el.classList.add("in");
    else revealer.observe(el);
  });

  document.querySelectorAll(".service, .panel, .response, .request").forEach((el) => el.classList.add("spot"));
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest && e.target.closest(".spot");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  const navLinks = [...document.querySelectorAll(".nav a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("active", a.hash === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));

  const progress = $("#progress");
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.setProperty("--p", max > 0 ? scrollY / max : 0);
      ticking = false;
    });
  }, { passive: true });

  /* ---------- hero network canvas ---------- */
  (() => {
    const c = $("#net");
    const ctx = c.getContext("2d");
    const hero = $(".hero");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const LINK = 150, MOUSE = 190;
    let W = 0, H = 0, nodes = [], packets = [], mouse = null, visible = true, raf = 0, lastSpawn = 0;

    function size() {
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * dpr; c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(90, Math.round((W * H) / 15000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.2 + 1,
      }));
      packets = [];
    }

    function spawnPacket() {
      const a = pick(nodes);
      let best = null, bd = LINK;
      for (const b of nodes) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (b !== a && d < bd && Math.random() < 0.6) { best = b; bd = d; }
      }
      if (best) packets.push({ a, b: best, t: 0, c: Math.random() < 0.7 ? "0, 240, 255" : "255, 43, 214" });
    }

    function draw(now = 0, still = false) {
      ctx.clearRect(0, 0, W, H);
      for (const n of nodes) {
        if (!still) {
          if (mouse) {
            const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
            if (d < MOUSE && d > 1) { n.vx += (dx / d) * 0.012; n.vy += (dy / d) * 0.012; }
          }
          n.vx = Math.max(-0.6, Math.min(0.6, n.vx * 0.995));
          n.vy = Math.max(-0.6, Math.min(0.6, n.vy * 0.995));
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(0, 240, 255, ${(1 - d / LINK) * 0.22})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (mouse) {
          const d = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (d < MOUSE) {
            ctx.strokeStyle = `rgba(255, 43, 214, ${(1 - d / MOUSE) * 0.45})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(160, 250, 255, .75)";
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      if (still) return;
      if (now - lastSpawn > 260) { spawnPacket(); lastSpawn = now; }
      ctx.shadowBlur = 12;
      packets = packets.filter((p) => (p.t += 0.018) < 1);
      for (const p of packets) {
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.shadowColor = ctx.fillStyle = `rgba(${p.c}, 1)`;
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    function loop(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    const start = () => { if (!raf && !reduceMotion) raf = requestAnimationFrame(loop); };

    size();
    if (reduceMotion) draw(0, true);
    new ResizeObserver(() => { size(); if (reduceMotion) draw(0, true); }).observe(hero);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(c);
    document.addEventListener("visibilitychange", start);
    addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      mouse = y >= 0 && y <= r.height ? { x, y } : null;
    }, { passive: true });
    document.addEventListener("pointerleave", () => (mouse = null));
    start();
  })();

  /* ---------- 3D tilt on project cards ---------- */
  if (!reduceMotion && matchMedia("(hover: hover)").matches) {
    $("#services").addEventListener("pointermove", (e) => {
      const card = e.target.closest(".service");
      if (!card || card.classList.contains("open")) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add("tilting");
      card.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-4px)`;
    });
    $("#services").addEventListener("pointerout", (e) => {
      const card = e.target.closest(".service");
      if (card && !card.contains(e.relatedTarget)) {
        card.classList.remove("tilting");
        card.style.transform = "";
      }
    });
  }

  /* ---------- resume button ---------- */
  const cv = $("#cv-btn");
  if (D.contact.resume) {
    cv.href = D.contact.resume;
    if (location.protocol === "file:") cv.hidden = false;
    else fetch(D.contact.resume, { method: "HEAD" }).then((r) => (cv.hidden = !r.ok)).catch(() => {});
  }

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- command palette (Ctrl/⌘ + K) ---------- */
  const pal = $("#palette");
  const palIn = $("#palette-in");
  const palList = $("#palette-list");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  $("#kbd-mod").textContent = isMac ? "⌘" : "Ctrl";

  const goTo = (id) => () => document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  const ACTIONS = [
    ...[...document.querySelectorAll("main section[id]")].map((s) => ({ group: "go to", label: "/" + s.id, run: goTo(s.id) })),
    ...D.projects.map((p) => ({ group: "open", label: p.name, hint: "case study", run: () => COMMANDS.open([p.id]) })),
    { group: "action", label: "copy email", hint: D.contact.email, run: async () => {
      try { await navigator.clipboard.writeText(D.contact.email); toast("✓ email copied to clipboard"); }
      catch (e) { window.location.href = mailto(); }
    } },
    { group: "action", label: "send email", hint: D.contact.email, run: () => (window.location.href = mailto()) },
    D.contact.github && { group: "action", label: "open github", hint: handle(D.contact.github), run: () => window.open(D.contact.github, "_blank", "noopener") },
    D.contact.linkedin && { group: "action", label: "open linkedin", run: () => window.open(D.contact.linkedin, "_blank", "noopener") },
    { group: "action", label: "download resume", hint: D.contact.resume, when: () => !cv.hidden, run: () => cv.click() },
    { group: "action", label: "toggle live logs", run: () => setCollapsed(!logBox.classList.contains("collapsed")) },
    { group: "action", label: "back to top", run: () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }) },
    { group: "secret", label: "sudo hire me", run: () => hire() },
  ].filter(Boolean);

  let palItems = [];
  let palSel = 0;
  let palReturn = null;

  // Subsequence match, so "ghb" finds "open github".
  const fuzzy = (q, text) => {
    let i = 0;
    for (const ch of text.toLowerCase()) if (ch === q[i]) i++;
    return i === q.length;
  };

  function renderPalette() {
    const q = palIn.value.trim().toLowerCase().replace(/\s+/g, "");
    palItems = ACTIONS.filter((a) => (!a.when || a.when()) && fuzzy(q, `${a.group}${a.label}${a.hint || ""}`.replace(/\s+/g, "")));
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    palList.innerHTML = palItems.length
      ? palItems.map((a, i) => `<li role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === palSel}"><span class="pg">${esc(a.group)}</span><span>${esc(a.label)}</span>${a.hint ? `<span class="ph">${esc(a.hint)}</span>` : ""}</li>`).join("")
      : `<li class="empty">zsh: no matches found</li>`;
    palIn.setAttribute("aria-activedescendant", palItems.length ? `pal-${palSel}` : "");
    const sel = palList.children[palSel];
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }
  function openPalette() {
    if (!pal.hidden) return;
    palReturn = document.activeElement;
    pal.hidden = false;
    palIn.value = "";
    palSel = 0;
    renderPalette();
    palIn.focus();
  }
  function closePalette() {
    pal.hidden = true;
    if (palReturn) palReturn.focus({ preventScroll: true });
  }
  function runPalette(i) {
    const a = palItems[i];
    if (!a) return;
    closePalette();
    a.run();
  }

  $("#palette-open").addEventListener("click", openPalette);
  palIn.addEventListener("input", () => { palSel = 0; renderPalette(); });
  palIn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = palItems.length || 1;
      palSel = (palSel + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      renderPalette();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runPalette(palSel);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  });
  palList.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) runPalette(+li.dataset.i);
  });
  palList.addEventListener("pointermove", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li && +li.dataset.i !== palSel) { palSel = +li.dataset.i; renderPalette(); }
  });
  pal.addEventListener("click", (e) => { if (e.target === pal) closePalette(); });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      pal.hidden ? openPalette() : closePalette();
    }
  });

  /* ---------- GitHub live stats ---------- */
  (async () => {
    const box = $("#gh");
    const user = (D.contact.github || "").replace(/\/+$/, "").split("/").pop();
    if (!user) return $("#github").remove();
    const key = "gh:" + user;
    let data = null;
    try { data = JSON.parse(sessionStorage.getItem(key)); } catch (e) {}

    if (!data) {
      const get = (path) => fetch("https://api.github.com" + path).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      });
      try {
        const [u, repos] = await Promise.all([get(`/users/${user}`), get(`/users/${user}/repos?per_page=100&sort=pushed`)]);
        data = {
          url: u.html_url, repos_count: u.public_repos, followers: u.followers, since: u.created_at,
          repos: repos.filter((r) => !r.fork).map((r) => ({
            name: r.name, url: r.html_url, desc: r.description, lang: r.language, stars: r.stargazers_count, pushed: r.pushed_at,
          })),
        };
        try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
      } catch (err) {
        box.innerHTML = `
          <div class="response">
            <div class="response-bar"><span class="code bad">503 Service Unavailable</span><span class="c-dim">api.github.com</span></div>
            <pre class="json">${highlight({ error: "github_unreachable", hint: "rate limited or offline" })}</pre>
            <ul class="links"><li><span class="method get">GET</span><a href="${esc(D.contact.github)}" target="_blank" rel="noopener">${esc(handle(D.contact.github))}</a></li></ul>
          </div>`;
        return;
      }
    }

    const COLORS = ["#00f0ff", "#ff2bd6", "#39ff14", "#f5ff3b", "#ff4d6d", "#9d7bff", "#9092ba"];
    const langCount = {};
    data.repos.forEach((r) => r.lang && (langCount[r.lang] = (langCount[r.lang] || 0) + 1));
    const langs = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const langTotal = langs.reduce((n, [, c]) => n + c, 0) || 1;
    const colorOf = Object.fromEntries(langs.map(([l], i) => [l, COLORS[i % COLORS.length]]));
    const stars = data.repos.reduce((n, r) => n + r.stars, 0);
    const ago = (iso) => {
      const s = (Date.now() - new Date(iso)) / 1000;
      for (const [u, n] of [["y", 31536000], ["mo", 2592000], ["d", 86400], ["h", 3600], ["m", 60]]) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
      return "just now";
    };

    box.innerHTML = `
      <div class="response spot">
        <div class="response-bar"><span class="code ok">200 OK</span><span class="c-dim">GET /users/${esc(user)}</span></div>
        <dl class="gh-stats">
          ${[["public repos", data.repos_count], stars ? ["stars earned", stars] : ["languages", Object.keys(langCount).length], ["followers", data.followers], ["coding since", new Date(data.since).getFullYear()]]
            .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
        </dl>
        <div class="gh-langs">
          <h4>// languages by repo</h4>
          <div class="lang-bar">${langs.map(([l, n]) => `<span style="background:${colorOf[l]};box-shadow:0 0 10px ${colorOf[l]}" data-w="${(n / langTotal) * 100}"></span>`).join("")}</div>
          <ul class="lang-legend">${langs.map(([l, n]) => `<li><i style="background:${colorOf[l]}"></i>${esc(l)} <span class="c-dim">${Math.round((n / langTotal) * 100)}%</span></li>`).join("")}</ul>
        </div>
      </div>
      <div class="response spot">
        <div class="response-bar"><span class="c-dim">recent pushes</span><a href="${esc(data.url)}" target="_blank" rel="noopener">→ all repos</a></div>
        <ul class="repos">${data.repos.slice(0, 4).map((r) => `
          <li>
            <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>
            ${r.desc ? `<p>${esc(r.desc)}</p>` : ""}
            <div class="repo-meta">
              ${r.lang ? `<span><i style="background:${colorOf[r.lang] || "#9092ba"}"></i>${esc(r.lang)}</span>` : ""}
              <span>★ ${r.stars}</span><span>updated ${ago(r.pushed)}</span>
            </div>
          </li>`).join("")}
        </ul>
      </div>`;

    // Grow the language bar once it scrolls into view.
    const bar = $(".lang-bar", box);
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      bar.querySelectorAll("span").forEach((s) => (s.style.width = s.dataset.w + "%"));
      obs.disconnect();
    }).observe(bar);
  })();

  /* ---------- response-time badge ---------- */
  addEventListener("load", () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const ms = nav && nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd - nav.startTime : performance.now();
      $("#served").textContent = Math.max(1, Math.round(ms));
    }, 0);
  });
})();
