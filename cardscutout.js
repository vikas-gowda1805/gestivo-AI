// Removes the dark background of the Explore & Play pictures so only the
// characters stay (true colors) and the card color shows behind them.

const PICS = [
  { files: ["/something.jpeg"], cut: true },
  { files: ["/hungry.jpeg"], cut: true },
  { files: ["/water.jpeg"], cut: true },
  { files: ["/game.jpeg"], cut: false },
  { files: ["/feeling.jpeg", "/happy.jpeg"], cut: true },
  { files: ["/yesno.jpeg", "/yesno%20(2).jpeg"], cut: true },
];

const LIMIT = 55; // how dark counts as background

function loadFirst(files, done) {
  let i = 0;
  const next = () => {
    if (i >= files.length) {
      done(null, null);
      return;
    }
    const src = files[i++];
    const img = new Image();
    img.onload = () => done(img, src);
    img.onerror = next;
    img.src = src;
  };
  next();
}

function cutout(img) {
  const scale = Math.min(1, 520 / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  const frame = ctx.getImageData(0, 0, w, h);
  const d = frame.data;

  const dark = (p) => Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]) < LIMIT;
  const gone = new Uint8Array(w * h);
  const stack = [];

  const push = (p) => {
    if (!gone[p] && dark(p)) {
      gone[p] = 1;
      stack.push(p);
    }
  };

  for (let x = 0; x < w; x++) push(x);
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + (w - 1));
  }

  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }

  for (let p = 0; p < w * h; p++) {
    if (gone[p]) d[p * 4 + 3] = 0;
  }

  // soften the dark fringe right next to the removed background
  const fringe = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (gone[p]) continue;
      if (gone[p - 1] || gone[p + 1] || gone[p - w] || gone[p + w]) {
        const m = Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
        if (m < 95) fringe.push(p);
      }
    }
  }
  fringe.forEach((p) => {
    d[p * 4 + 3] = 110;
  });

  ctx.putImageData(frame, 0, 0);
  return c.toDataURL("image/png");
}

const cache = {};

function getPic(cfg) {
  const key = cfg.files.join("|");
  if (!cache[key]) {
    cache[key] = new Promise((resolve) => {
      loadFirst(cfg.files, (img, src) => {
        if (!img) {
          resolve(null);
          return;
        }
        let url = 'url("' + src + '")';
        if (cfg.cut) {
          try {
            url = 'url("' + cutout(img) + '")';
          } catch (e) {
            console.error(e);
          }
        }
        resolve(url);
      });
    });
  }
  return cache[key];
}

function scan() {
  document.querySelectorAll(".explore-row .explore-card").forEach((card) => {
    if (card.dataset.cut) return;
    const index = Array.from(card.parentElement.children).indexOf(card);
    const cfg = PICS[index];
    if (!cfg) return;
    card.dataset.cut = "1";
    getPic(cfg).then((url) => {
      if (url) card.style.setProperty("--pic", url);
    });
  });
}

new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
scan();
// ---- Memory Game: find the cards and mark them so the CSS can make them big ----
function findMemoryGrid() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.includes("Find the matching pairs")) {
      const label = node.parentElement;
      let scope = label.parentElement;

      for (let depth = 0; depth < 4 && scope; depth++) {
        const grid = Array.from(scope.querySelectorAll("*")).find(
          (n) =>
            !n.contains(label) &&
            label.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING &&
            n.children.length >= 8 &&
            Array.from(n.children).every((c) => c.textContent.trim().length <= 4)
        );
        if (grid) return { label, grid };
        scope = scope.parentElement;
      }
    }
  }
  return null;
}

function fixMemory() {
  const found = findMemoryGrid();
  if (!found) return;
  found.label.classList.add("gx-memory-label");
  found.grid.classList.add("gx-memory-grid");
}

new MutationObserver(fixMemory).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
fixMemory();
// ---- Shape Match / Animal Sounds / Story Time: make the whole game screen bigger ----
const BIG_GAMES = ["Shape Match", "Animal Sounds", "Story Time"];

function fixBigGames() {
  let target = null;

  document.querySelectorAll("h1, h2, h3, h4, .section-title").forEach((h) => {
    if (target) return;
    if (h.closest(".explore-row")) return;

    const text = h.textContent || "";
    if (!BIG_GAMES.some((t) => text.includes(t))) return;

    let el = h;
    while (el.parentElement && !el.parentElement.classList.contains("main")) {
      el = el.parentElement;
      if (el === document.body) return;
    }
    if (el.parentElement) target = el;
  });

  document.querySelectorAll(".gx-game-view").forEach((el) => {
    if (el !== target) el.classList.remove("gx-game-view");
  });
  if (target) target.classList.add("gx-game-view");
}

new MutationObserver(fixBigGames).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
fixBigGames();