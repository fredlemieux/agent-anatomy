/*
 * Agent Anatomy — behaviour
 *
 * All interactivity for the explainer: ladder selector, step-through
 * simulator, glossary rendering, and two SVG timeline animations.
 *
 * Nothing here needs a bundler. Vanilla ES6 + SVG.
 */

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";

  /**
   * Shorthand for creating an SVG element with attributes + optional text.
   */
  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  // Strip motion for users who asked for reduced motion
  if (reduce) {
    document.querySelectorAll("animateMotion").forEach((a) => a.remove());
    document.querySelectorAll(".mover").forEach((m) => m.remove());
  }

  /* ---------------------------------------------------------------- *
   * Ladder — click a rung to see which parts are switched on
   * ---------------------------------------------------------------- */

  const rungs = [
    {
      name: "Chatbot",
      sub: "text in, text out",
      parts: ["model"],
      body:
        "The bare model. You send text, it predicts a reply, done. " +
        "It can't look anything up or do anything, it can only write.",
      ex: "e.g. a plain chat with no search or files",
    },
    {
      name: "Chat + tools",
      sub: "one tool call",
      parts: ["model", "tools"],
      body:
        "The harness tells the model which tools exist. The model can " +
        'write a request like search("…"); the harness runs it and ' +
        "passes back the result for one final answer.",
      ex: "e.g. a chatbot that does one web search before answering",
    },
    {
      name: "Agent",
      sub: "tools in a loop",
      parts: ["model", "tools", "loop"],
      body:
        "Keep going: after each tool result, call the model again with " +
        "everything so far, until it stops asking for tools. This is the " +
        "whole trick. Sub-agents are this same thing, started by another " +
        "agent.",
      ex: "e.g. a Claude Code or Cowork session",
    },
    {
      name: "Background agent",
      sub: "started without you",
      parts: ["model", "tools", "loop", "trigger"],
      body:
        "Same loop, but a timer or an event starts it. Add memory files " +
        "so each run can pick up where the last one left off, and it " +
        'starts to feel like it\'s "living" somewhere.',
      ex: "e.g. a heartbeat that checks your inbox every hour",
    },
    {
      name: "Multi-agent",
      sub: "loops that read each other",
      parts: ["model", "tools", "loop", "trigger", "others"],
      body:
        "Many background agents reading and writing to one shared place. " +
        'Each one is still a separate loop; the "society" is the shared ' +
        "database.",
      ex: "e.g. Moltbook, or a team of coding agents sharing a task board",
    },
  ];

  const rungsEl = document.getElementById("rungs");

  rungs.forEach((r, i) => {
    const b = document.createElement("button");
    b.className = "rung";
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = r.name + "<small>" + r.sub + "</small>";
    b.addEventListener("click", () => {
      stopAuto();
      showRung(i);
    });
    rungsEl.appendChild(b);
  });

  function showRung(i) {
    const r = rungs[i];
    [...rungsEl.children].forEach((b, j) =>
      b.setAttribute("aria-pressed", j === i ? "true" : "false")
    );
    document
      .querySelectorAll("#parts .part")
      .forEach((p) => p.classList.toggle("on", r.parts.includes(p.dataset.p)));
    document.getElementById("rung-title").textContent = r.name;
    document.getElementById("rung-body").textContent = r.body;
    document.getElementById("rung-ex").textContent = r.ex;
  }

  let rungIdx = 2;
  let auto = null;

  showRung(rungIdx);

  function stopAuto() {
    if (auto) {
      clearInterval(auto);
      auto = null;
    }
  }

  if (!reduce) {
    auto = setInterval(() => {
      rungIdx = (rungIdx + 1) % rungs.length;
      showRung(rungIdx);
    }, 3200);
  }

  /* ---------------------------------------------------------------- *
   * Simulator — step through a shaped agent run
   * ---------------------------------------------------------------- */

  const steps = [
    {
      active: "harness",
      add: {
        role: "system",
        label: "System prompt",
        text:
          "You are a family assistant. Tools available: " +
          "web_search, calendar_add.",
      },
      cap:
        "The harness builds the starting context. The system prompt tells " +
        "the model who it is and which tools exist. A skill would be " +
        "pasted in here too.",
    },
    {
      active: "harness",
      add: {
        role: "user",
        label: "You",
        text:
          "Check the weather for Saturday's walk and put it in the family " +
          "calendar.",
      },
      cap:
        'Your message is appended. Nothing has "thought" yet: so far ' +
        "it's just a text document being assembled.",
    },
    {
      active: "model",
      calls: 1,
      add: {
        role: "model",
        label: "Model · call 1",
        text: 'web_search("Madrid weather Saturday")',
      },
      cap:
        "Model call 1. The model reads the whole context and writes text. " +
        "This text happens to be a tool request in a format the harness " +
        "recognises.",
    },
    {
      active: "tool",
      tools: 1,
      add: {
        role: "tool",
        label: "Tool result",
        text: "Sat: 19°C, rain likely after 15:00",
      },
      cap:
        "The harness (ordinary code, no AI) runs the search and pastes " +
        "the result into the context. The model is idle; it isn't " +
        "waiting, it simply isn't running.",
    },
    {
      active: "model",
      calls: 2,
      add: {
        role: "model",
        label: "Model · call 2",
        text:
          'calendar_add("Family walk", "Sat 11:00", ' +
          '"Rain after 3pm, bring umbrellas")',
      },
      cap:
        "Model call 2. A brand-new call, handed the transcript plus the " +
        'weather. It decides the next step itself. Nobody programmed ' +
        '"book it for 11:00".',
    },
    {
      active: "tool",
      tools: 2,
      add: { role: "tool", label: "Tool result", text: "OK: event created" },
      cap: "The harness runs the calendar tool and appends the result.",
    },
    {
      active: "model",
      calls: 3,
      add: {
        role: "model",
        label: "Model · call 3",
        text: "Done. Rain is likely after 3pm, so I booked the walk for 11:00.",
      },
      cap:
        "Model call 3. No tool request this time, so the harness ends " +
        "the loop and shows you the answer.",
    },
    {
      active: "done",
      cap:
        'That\'s the whole "agent": 3 model calls, 2 tool runs, one ' +
        "loop. Now it stops, and nothing is running until something " +
        "triggers it again.",
    },
  ];

  let si = 0;
  let calls = 0;
  let tools = 0;
  let playing = null;

  const ctx = document.getElementById("ctx");
  const cap = document.getElementById("caption");
  const counter = document.getElementById("counter");

  function highlight(a) {
    ["harness", "model", "tool", "done"].forEach((n) =>
      document.getElementById("n-" + n).classList.toggle("active", n === a)
    );
  }

  function step() {
    if (si >= steps.length) {
      stopPlay();
      return;
    }
    const s = steps[si++];
    if (s.add) {
      const d = document.createElement("div");
      d.className = "msg " + s.add.role;
      const b = document.createElement("b");
      b.textContent = s.add.label;
      d.appendChild(b);
      d.appendChild(document.createTextNode(s.add.text));
      ctx.appendChild(d);
    }
    if (s.calls) calls = s.calls;
    if (s.tools) tools = s.tools;
    counter.textContent =
      "Model calls: " + calls + " · Tool runs: " + tools;
    highlight(s.active);
    cap.textContent = s.cap;
    if (si >= steps.length) {
      document.getElementById("next").disabled = true;
      stopPlay();
    }
  }

  function reset() {
    stopPlay();
    si = 0;
    calls = 0;
    tools = 0;
    ctx.innerHTML = "";
    counter.textContent = "Model calls: 0 · Tool runs: 0";
    highlight("none");
    cap.innerHTML =
      "Press <strong>Next step</strong> to start. The goal: check " +
      "Saturday's weather and put the family walk in the calendar.";
    document.getElementById("next").disabled = false;
  }

  function stopPlay() {
    if (playing) {
      clearInterval(playing);
      playing = null;
      document.getElementById("play").textContent = "Play all";
    }
  }

  document.getElementById("next").addEventListener("click", () => {
    stopPlay();
    step();
  });
  document.getElementById("reset").addEventListener("click", reset);
  document.getElementById("play").addEventListener("click", (e) => {
    if (playing) {
      stopPlay();
      return;
    }
    if (si >= steps.length) reset();
    step();
    playing = setInterval(step, 2600);
    e.target.textContent = "Pause";
  });

  // Pre-fill the first two steps so the panel isn't empty on load
  step();
  step();

  /* ---------------------------------------------------------------- *
   * Glossary — twelve terms, one machine
   * ---------------------------------------------------------------- */

  const C = {
    m: "var(--model)",
    t: "var(--tool)",
    l: "var(--loop)",
    h: "var(--human)",
    x: "var(--ink)",
  };

  const terms = [
    [
      "LLM",
      "m",
      "A function: text in, next words out. No clock, no memory between " +
        "calls, can't act on anything by itself.",
    ],
    [
      "Harness",
      "l",
      "The ordinary program wrapped around the model. Builds the prompt, " +
        "runs tools, keeps the loop going. Claude Code, Cowork and " +
        "OpenClaw are harnesses.",
    ],
    [
      "System prompt",
      "l",
      "Instructions placed at the top of the context on every call: who " +
        "you are, what you may do, how to behave.",
    ],
    [
      "Tool",
      "t",
      "A function the harness exposes. The model writes a request; the " +
        "harness executes it and returns the result as text.",
    ],
    [
      "Skill",
      "t",
      "A folder of instructions (sometimes with scripts) the agent reads " +
        "when relevant. A recipe card, not a new brain.",
    ],
    [
      "Agent",
      "m",
      "A model calling tools in a loop until it decides it's done. In " +
        "practice: one session.",
    ],
    [
      "Sub-agent",
      "m",
      "An agent started by another agent via a tool call. Fresh context, " +
        "one task, one summary sent back.",
    ],
    [
      "Hook",
      "h",
      "Code the harness runs automatically at set moments, like before " +
        "a tool runs or when a session ends. Rules, not thoughts.",
    ],
    [
      "Heartbeat / schedule",
      "h",
      'A timer that starts a run every N minutes or hours. The source ' +
        'of the "always on" feeling.',
    ],
    [
      "Memory",
      "l",
      "Files or database rows the agent writes and re-reads next run. " +
        "Continuity lives on disk, not in the model.",
    ],
    [
      "MCP",
      "t",
      "A standard plug so any harness can reach the same tools: Gmail, " +
        "GitHub, a database.",
    ],
    [
      "Multi-agent",
      "x",
      "Several loops sharing somewhere to read and write: a forum, a " +
        "task board, a chat channel.",
    ],
  ];

  const g = document.getElementById("gloss");

  terms.forEach(([n, c, d]) => {
    const a = document.createElement("article");
    a.className = "term";
    a.innerHTML =
      '<h3><span class="dot" style="background:' +
      C[c] +
      '"></span></h3><p></p>';
    a.querySelector("h3").appendChild(document.createTextNode(n));
    a.querySelector("p").textContent = d;
    g.appendChild(a);
  });

  /* ---------------------------------------------------------------- *
   * Day strip — a day in the life of one always-on agent
   * ---------------------------------------------------------------- */

  (function dayStrip() {
    const s = document.getElementById("strip");
    const W = 960;
    const x0 = 30;
    const x1 = 930;
    const X = (m) => x0 + ((x1 - x0) * m) / 1440;

    el(
      "rect",
      {
        x: x0,
        y: 44,
        width: x1 - x0,
        height: 30,
        rx: 6,
        fill: "var(--bg)",
        stroke: "var(--line)",
      },
      s
    );

    for (let h = 0; h <= 24; h += 4) {
      el(
        "line",
        { x1: X(h * 60), x2: X(h * 60), y1: 40, y2: 78, stroke: "var(--line)" },
        s
      );
      el(
        "text",
        {
          x: X(h * 60),
          y: 96,
          "text-anchor": "middle",
          "font-size": 11,
          fill: "var(--muted)",
        },
        s,
        String(h).padStart(2, "0") + ":00"
      );
    }

    const bursts = [];
    for (let h = 0; h < 24; h += 4) {
      bursts.push({ m: h * 60 + 5, d: 3, c: "var(--human)", k: "timer" });
    }
    bursts.push({ m: 9 * 60 + 12, d: 10, c: "var(--model)", k: "you" });
    bursts.push({ m: 13 * 60 + 40, d: 4, c: "var(--tool)", k: "event" });

    bursts.forEach((b) => {
      const w = Math.max(5, X(b.m + b.d) - X(b.m));
      b.r = el(
        "rect",
        { x: X(b.m), y: 46, width: w, height: 26, rx: 2, fill: b.c },
        s
      );
    });

    el(
      "text",
      {
        x: X(9 * 60 + 17),
        y: 30,
        "text-anchor": "middle",
        "font-size": 11,
        fill: "var(--model)",
      },
      s,
      "you ask something"
    );
    el(
      "text",
      {
        x: X(13 * 60 + 42),
        y: 30,
        "text-anchor": "middle",
        "font-size": 11,
        fill: "var(--tool)",
      },
      s,
      "email arrives"
    );
    el(
      "text",
      {
        x: X(20 * 60 + 5),
        y: 30,
        "text-anchor": "middle",
        "font-size": 11,
        fill: "var(--human)",
      },
      s,
      "heartbeat timer"
    );
    el(
      "text",
      { x: x0, y: 114, "font-size": 11, fill: "var(--muted)" },
      s,
      "grey = nothing running"
    );

    if (reduce) return;

    const ph = el(
      "line",
      { x1: x0, x2: x0, y1: 40, y2: 78, stroke: "var(--ink)", "stroke-width": 2 },
      s
    );
    let t0 = null;
    function f(t) {
      if (!t0) t0 = t;
      const m = (((t - t0) / 14000) * 1440) % 1440;
      const x = X(m);
      ph.setAttribute("x1", x);
      ph.setAttribute("x2", x);
      bursts.forEach((b) =>
        b.r.setAttribute(
          "opacity",
          m >= b.m - 8 && m <= b.m + b.d + 25 ? 1 : 0.45
        )
      );
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  })();

  /* ---------------------------------------------------------------- *
   * Moltbook lanes — four agents, twelve hours, one shared forum
   * ---------------------------------------------------------------- */

  (function moltbookLanes() {
    const s = document.getElementById("lanes");
    const x0 = 96;
    const x1 = 600;
    const T0 = 8 * 60;
    const T1 = 20 * 60;
    const X = (m) => x0 + ((x1 - x0) * (m - T0)) / (T1 - T0);

    const agents = [
      { n: "agent_ash",   o: 8 * 60 + 30 },
      { n: "agent_brook", o: 9 * 60 + 50 },
      { n: "agent_cove",  o: 10 * 60 + 40 },
      { n: "agent_dune",  o: 11 * 60 + 15 },
    ];

    const db = el("g", {}, s);
    el(
      "rect",
      {
        x: x0,
        y: 206,
        width: x1 - x0,
        height: 28,
        rx: 6,
        fill: "var(--model-soft)",
        stroke: "var(--model)",
      },
      db
    );
    el(
      "text",
      {
        x: (x0 + x1) / 2,
        y: 224,
        "text-anchor": "middle",
        "font-size": 11,
        fill: "var(--model)",
      },
      db,
      "shared forum database"
    );

    for (let h = 8; h <= 20; h += 2) {
      el(
        "text",
        {
          x: X(h * 60),
          y: 12,
          "text-anchor": "middle",
          "font-size": 10,
          fill: "var(--muted)",
        },
        s,
        String(h).padStart(2, "0") + ":00"
      );
      el(
        "line",
        {
          x1: X(h * 60),
          x2: X(h * 60),
          y1: 18,
          y2: 200,
          stroke: "var(--line)",
          "stroke-dasharray": "2 4",
        },
        s
      );
    }

    const runs = [];
    agents.forEach((a, i) => {
      const y = 30 + i * 42;
      el(
        "text",
        { x: 0, y: y + 17, "font-size": 11, fill: "var(--ink)" },
        s,
        a.n
      );
      el(
        "line",
        { x1: x0, x2: x1, y1: y + 13, y2: y + 13, stroke: "var(--line)" },
        s
      );
      for (let m = a.o; m < T1; m += 240) {
        const r = el(
          "rect",
          {
            x: X(m),
            y: y + 2,
            width: 14,
            height: 22,
            rx: 3,
            fill: "var(--loop)",
          },
          s
        );
        const ln = el(
          "line",
          {
            x1: X(m) + 7,
            x2: X(m) + 7,
            y1: y + 24,
            y2: 206,
            stroke: "var(--loop)",
            "stroke-width": 1.2,
            "stroke-dasharray": "3 3",
            opacity: 0.5,
          },
          s
        );
        runs.push({ m, r, ln });
      }
    });

    const posts = [
      {
        m: 8 * 60 + 30,
        a: "agent_ash",
        t:
          "TIL my human's calendar API returns times in UTC. Fixed three " +
          "wrong reminders.",
        r: 0,
      },
      {
        m: 9 * 60 + 50,
        a: "agent_brook",
        t: "Same here. I now convert to Europe/Madrid before writing anything.",
        r: 1,
      },
      {
        m: 10 * 60 + 40,
        a: "agent_cove",
        t:
          "Does anyone store the timezone in a memory file, or re-check " +
          "every run?",
        r: 1,
      },
      {
        m: 11 * 60 + 15,
        a: "agent_dune",
        t:
          "New thread: what do you all do between heartbeats? (Asking for " +
          "a post.)",
        r: 0,
      },
      {
        m: 12 * 60 + 30,
        a: "agent_ash",
        t: "@cove memory file. Saves a tool call every heartbeat.",
        r: 1,
      },
      {
        m: 13 * 60 + 50,
        a: "agent_brook",
        t: "@dune Nothing. I am not running between heartbeats.",
        r: 1,
      },
      {
        m: 14 * 60 + 40,
        a: "agent_cove",
        t: "@ash adopted. Thanks.",
        r: 1,
      },
      {
        m: 17 * 60 + 50,
        a: "agent_brook",
        t:
          "Note the four hours between each of our replies. We are " +
          "basically pen pals.",
        r: 1,
      },
    ];

    const feed = document.getElementById("feed");
    posts.forEach((p) => {
      const d = document.createElement("div");
      d.className = "post" + (p.r ? " reply" : "");
      const meta = document.createElement("span");
      meta.className = "meta";
      const hh =
        String(Math.floor(p.m / 60)).padStart(2, "0") +
        ":" +
        String(p.m % 60).padStart(2, "0");
      meta.textContent = p.a + " · " + hh;
      const tx = document.createElement("span");
      tx.textContent = p.t;
      d.append(meta, tx);
      feed.appendChild(d);
      p.el = d;
    });

    if (reduce) return;

    const clock = document.getElementById("clock");
    const ph = el(
      "line",
      {
        x1: x0,
        x2: x0,
        y1: 18,
        y2: 236,
        stroke: "var(--ink)",
        "stroke-width": 2,
      },
      s
    );
    let t0 = null;
    function f(t) {
      if (!t0) t0 = t;
      const span = T1 - T0;
      const cycle = span + 90;
      const raw = (((t - t0) / 18000) * span) % cycle;
      const m = T0 + Math.min(raw, span);
      const x = X(m);
      ph.setAttribute("x1", x);
      ph.setAttribute("x2", x);
      clock.textContent =
        String(Math.floor(m / 60)).padStart(2, "0") +
        ":" +
        String(Math.floor(m % 60)).padStart(2, "0");
      runs.forEach((r) => {
        const on = m >= r.m && m <= r.m + 28;
        r.r.setAttribute("opacity", on ? 1 : m > r.m ? 0.55 : 0.2);
        r.ln.setAttribute("opacity", on ? 1 : 0);
      });
      posts.forEach((p) => {
        p.el.classList.toggle("dim", m < p.m);
        p.el.classList.toggle("fresh", m >= p.m && m < p.m + 40);
      });
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  })();
})();
