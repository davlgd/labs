(() => {
  const root = document.documentElement;

  // ── Theme ─────────────────────────────────────────────────
  const THEME_KEY = "blog-theme-tg2";
  const setTheme = (t) => {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    const btn = document.querySelector(".theme-toggle");
    if (btn) btn.textContent = t === "dark" ? "☀" : "☾";
  };
  const initialTheme = (() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored;
    } catch {}
    return "dark";
  })();
  setTheme(initialTheme);
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // ── Typewriter ────────────────────────────────────────────
  const typeOne = (el) => {
    const text = el.dataset.text || el.textContent;
    const speed = parseInt(el.dataset.speed || "32", 10);
    const delay = parseInt(el.dataset.delay || "0", 10);
    el.textContent = "";
    el.classList.add("tw");
    const caret = document.createElement("span");
    caret.className = "caret";
    el.appendChild(caret);
    let i = 0;
    setTimeout(function tick() {
      if (i <= text.length) {
        caret.remove();
        el.textContent = text.slice(0, i);
        el.appendChild(caret);
        i += 1;
        setTimeout(tick, speed);
      } else {
        caret.remove();
      }
    }, delay);
  };
  document.querySelectorAll("[data-typewriter]").forEach(typeOne);

  // ── Glitch hover ──────────────────────────────────────────
  const GLITCH = "!<>-_\\/[]{}—=+*^?#________ABC";
  document.querySelectorAll(".glitch").forEach((el) => {
    let raf;
    const target = el.dataset.text || el.textContent;
    el.addEventListener("mouseenter", () => {
      cancelAnimationFrame(raf);
      let frame = 0;
      const total = 14;
      const lock = new Array(target.length).fill(false);
      const tick = () => {
        frame += 1;
        const out = target.split("").map((ch, i) => {
          if (ch === " ") return " ";
          if (lock[i]) return ch;
          if (Math.random() < frame / total) { lock[i] = true; return ch; }
          return GLITCH[Math.floor(Math.random() * GLITCH.length)];
        }).join("");
        el.textContent = out;
        if (frame < total) raf = requestAnimationFrame(tick);
        else el.textContent = target;
      };
      raf = requestAnimationFrame(tick);
    });
  });

  // ── Reading progress ──────────────────────────────────────
  const bar = document.getElementById("progressBar");
  if (bar && document.querySelector(".article")) {
    const onScroll = () => {
      const max = root.scrollHeight - root.clientHeight;
      bar.style.width = (max > 0 ? (root.scrollTop / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ── Reveal on scroll ─────────────────────────────────────
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    const vh = window.innerHeight || 800;
    reveals.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 1.1) el.classList.add("in");
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  // ── Tag filter chips (homepage) ──────────────────────────
  const chips = document.querySelectorAll(".chip[data-tag]");
  const fileRows = document.querySelectorAll("[data-tags]");
  const visibleEl = document.getElementById("statVisible");
  const minTotalEl = document.getElementById("statMinTotal");
  const avgMinEl = document.getElementById("statAvgMin");
  const recompute = (tag) => {
    let visible = 0, total = 0;
    fileRows.forEach((row) => {
      const tags = (row.dataset.tags || "").split(",").filter(Boolean);
      const match = tag === "all" || tags.includes(tag);
      row.classList.toggle("hidden", !match);
      if (match) {
        visible += 1;
        total += parseInt(row.dataset.read || "0", 10);
      }
    });
    if (visibleEl) visibleEl.textContent = visible;
    if (minTotalEl) minTotalEl.textContent = total;
    if (avgMinEl) avgMinEl.textContent = visible > 0 ? Math.round(total / visible) : 0;
  };
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      recompute(chip.dataset.tag);
    });
  });

  // ── Share-bar copy link ──────────────────────────────────
  document.querySelectorAll(".share-link[data-copy]").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(a.dataset.copy);
        const orig = a.textContent;
        a.textContent = "↗ copied";
        setTimeout(() => { a.textContent = orig; }, 1400);
      } catch {}
    });
  });

  // ── Code copy buttons ────────────────────────────────────
  document.querySelectorAll(".code-copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const wrap = btn.closest(".code-wrap");
      const code = wrap?.querySelector("pre")?.textContent || "";
      try {
        await navigator.clipboard.writeText(code);
        const orig = btn.textContent;
        btn.textContent = "✓ copied";
        setTimeout(() => { btn.textContent = orig; }, 1400);
      } catch {}
    });
  });

  // ── Article TOC active state ─────────────────────────────
  const tocLinks = document.querySelectorAll(".toc a[href^='#']");
  if (tocLinks.length) {
    const headings = Array.from(tocLinks).map((a) => document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)))).filter(Boolean);
    const onScroll = () => {
      let cur = headings[0];
      for (const h of headings) {
        if (h.getBoundingClientRect().top < 140) cur = h;
      }
      tocLinks.forEach((a) => {
        const id = decodeURIComponent(a.getAttribute("href").slice(1));
        a.classList.toggle("active", cur && cur.id === id);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ── Command palette ───────────────────────────────────────
  const overlay = document.getElementById("kbarOverlay");
  const kbarInput = document.getElementById("kbarInput");
  const kbarItems = overlay ? Array.from(overlay.querySelectorAll(".kbar-item")) : [];
  const kbarEmpty = document.getElementById("kbarEmpty");
  let kbarSel = 0;

  const openKbar = () => {
    if (!overlay) return;
    overlay.hidden = false;
    if (kbarInput) { kbarInput.value = ""; setTimeout(() => kbarInput.focus(), 30); }
    kbarSel = 0;
    filterKbar("");
  };
  const closeKbar = () => { if (overlay) overlay.hidden = true; };
  const filterKbar = (q) => {
    const needle = q.toLowerCase();
    let visible = 0;
    kbarItems.forEach((it) => {
      const text = (it.dataset.search || it.textContent).toLowerCase();
      const onlySearch = it.classList.contains("kbar-only-search");
      const match = needle ? text.includes(needle) : !onlySearch;
      it.classList.toggle("hidden", !match);
      if (match) visible += 1;
    });
    if (overlay) {
      overlay.querySelectorAll("[data-only-empty]").forEach((el) => {
        el.hidden = !!needle;
      });
    }
    if (kbarEmpty) kbarEmpty.hidden = visible > 0;
    setKbarSel(0);
  };
  const setKbarSel = (idx) => {
    const visible = kbarItems.filter((it) => !it.classList.contains("hidden"));
    if (!visible.length) return;
    kbarSel = (idx + visible.length) % visible.length;
    kbarItems.forEach((it) => it.classList.remove("active"));
    visible[kbarSel].classList.add("active");
    visible[kbarSel].scrollIntoView({ block: "nearest" });
  };

  if (overlay) {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeKbar(); });
    kbarInput?.addEventListener("input", (e) => filterKbar(e.target.value));
    kbarItems.forEach((it) => {
      it.addEventListener("click", () => {
        const url = it.dataset.url;
        if (url) window.location.href = url;
        closeKbar();
      });
      it.addEventListener("mouseenter", () => {
        const visible = kbarItems.filter((x) => !x.classList.contains("hidden"));
        const idx = visible.indexOf(it);
        if (idx >= 0) setKbarSel(idx);
      });
    });
  }

  document.querySelectorAll(".kbar-trigger").forEach((b) => b.addEventListener("click", openKbar));

  // ── Global keys ──────────────────────────────────────────
  let gPending = false;
  const gTimer = { id: null };
  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement?.tagName || "").toUpperCase();
    const inField = tag === "INPUT" || tag === "TEXTAREA";
    if (!overlay?.hidden) {
      if (e.key === "Escape") { e.preventDefault(); closeKbar(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setKbarSel(kbarSel + 1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setKbarSel(kbarSel - 1); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const visible = kbarItems.filter((it) => !it.classList.contains("hidden"));
        const target = visible[kbarSel];
        if (target?.dataset.url) window.location.href = target.dataset.url;
        return;
      }
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault(); openKbar(); return;
    }
    if (inField) return;
    if (e.key === "/") { e.preventDefault(); openKbar(); return; }
    if (gPending) {
      const map = window.__navMap || {};
      const url = map[e.key];
      if (url) { e.preventDefault(); window.location.href = url; }
      gPending = false;
      clearTimeout(gTimer.id);
      return;
    }
    if (e.key === "g") {
      gPending = true;
      gTimer.id = setTimeout(() => { gPending = false; }, 800);
    }
  });

  // ── Client-side search (search page) ─────────────────────
  const searchInput = document.getElementById("searchInput");
  const searchMeta = document.getElementById("searchMeta");
  const searchResults = document.getElementById("searchResults");
  if (searchInput && searchResults) {
    const items = Array.from(searchResults.querySelectorAll(".file-row"));
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const titleCache = items.map((it) => ({
      el: it,
      title: it.querySelector(".name .title")?.textContent || "",
      id: it.querySelector(".name > span:first-child")?.textContent || "",
      tags: (it.dataset.tags || ""),
      excerpt: it.dataset.excerpt || "",
      content: it.dataset.content || "",
    }));
    const apply = (q) => {
      const needle = q.trim().toLowerCase();
      let count = 0;
      titleCache.forEach(({ el, title, id, tags, excerpt, content }) => {
        const haystack = (title + " " + id + " " + tags + " " + excerpt + " " + content).toLowerCase();
        const match = !needle || haystack.includes(needle);
        el.classList.toggle("hidden", !match);
        if (match) count += 1;
        const titleEl = el.querySelector(".name .title");
        if (titleEl) {
          if (!needle) titleEl.textContent = title;
          else {
            const re = new RegExp("(" + escapeRegex(q) + ")", "ig");
            titleEl.innerHTML = title.replace(re, "<mark>$1</mark>");
          }
        }
      });
      if (searchMeta) {
        searchMeta.textContent = needle
          ? `→ ${count} match${count === 1 ? "" : "es"} found`
          : "→ Type a pattern. Searches titles, tags, descriptions, and full post content.";
      }
    };
    searchInput.addEventListener("input", (e) => apply(e.target.value));
    searchInput.focus();
    apply("");
  }
})();
