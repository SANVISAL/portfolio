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
          <div class="arch-wrap"><h4>// architecture</h4><div class="arch">${archHTML(p)}</div></div>
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
    ".endpoint", ".about-bio", "#about .response", ".service", ".panel", ".commit", ".request", "#contact-response",
  ];
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealer.unobserve(e.target);
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

  /* ---------- response-time badge ---------- */
  addEventListener("load", () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const ms = nav && nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd - nav.startTime : performance.now();
      $("#served").textContent = Math.max(1, Math.round(ms));
    }, 0);
  });
})();
