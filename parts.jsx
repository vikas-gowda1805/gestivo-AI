import { useEffect, useState } from "react";
import { BOARD, CARDS } from "./data";

export function Pic({ src, emoji, className }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <span className={className}>{emoji}</span>;
  }
  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

// Removes ONLY the black background connected to the picture's outer edge.
// Dark parts inside the characters stay solid.
function useCutout(src) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 1400 / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);

        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const frame = ctx.getImageData(0, 0, w, h);
        const d = frame.data;

        const LIMIT = 42; // how dark counts as background
        const isDark = (p) =>
          Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]) < LIMIT;

        const removed = new Uint8Array(w * h);
        const stack = [];

        const push = (p) => {
          if (!removed[p] && isDark(p)) {
            removed[p] = 1;
            stack.push(p);
          }
        };

        for (let x = 0; x < w; x++) {
          push(x);
          push((h - 1) * w + x);
        }
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

        // clear the background, then soften the dark fringe on the edge
        const edge = [];
        for (let p = 0; p < w * h; p++) {
          if (removed[p]) {
            d[p * 4 + 3] = 0;
          }
        }
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (removed[p]) continue;
            if (
              removed[p - 1] ||
              removed[p + 1] ||
              removed[p - w] ||
              removed[p + w]
            ) {
              const m = Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
              if (m < 85) edge.push(p);
            }
          }
        }
        edge.forEach((p) => {
          d[p * 4 + 3] = 90;
        });

        ctx.putImageData(frame, 0, 0);
        setUrl(c.toDataURL("image/png"));
      } catch (e) {
        setUrl(src);
      }
    };
    img.onerror = () => setUrl("");
    img.src = src;
  }, [src]);

  return url;
}

const SPARKS = [
  { ch: "✨", left: "5%", top: "14%", size: 26, delay: "0s", dur: "3s" },
  { ch: "⭐", left: "12%", top: "58%", size: 20, delay: "0.5s", dur: "3.4s" },
  { ch: "💜", left: "18%", top: "30%", size: 22, delay: "1s", dur: "3.8s" },
  { ch: "✨", left: "24%", top: "78%", size: 18, delay: "1.5s", dur: "2.8s" },
  { ch: "⭐", left: "30%", top: "12%", size: 22, delay: "2s", dur: "3.2s" },
  { ch: "💖", left: "36%", top: "66%", size: 20, delay: "0.3s", dur: "3.6s" },
  { ch: "✨", left: "43%", top: "8%", size: 18, delay: "0.9s", dur: "3s" },
  { ch: "⭐", left: "50%", top: "22%", size: 16, delay: "1.4s", dur: "2.6s" },
  { ch: "💜", left: "57%", top: "10%", size: 20, delay: "1.9s", dur: "3.5s" },
  { ch: "✨", left: "63%", top: "74%", size: 20, delay: "0.2s", dur: "3.1s" },
  { ch: "⭐", left: "68%", top: "40%", size: 22, delay: "0.8s", dur: "3.3s" },
  { ch: "💖", left: "74%", top: "62%", size: 20, delay: "1.3s", dur: "3.9s" },
  { ch: "✨", left: "80%", top: "18%", size: 18, delay: "1.8s", dur: "2.9s" },
  { ch: "⭐", left: "86%", top: "52%", size: 24, delay: "2.3s", dur: "3.2s" },
  { ch: "💜", left: "91%", top: "80%", size: 22, delay: "0.6s", dur: "3.7s" },
  { ch: "✨", left: "95%", top: "34%", size: 18, delay: "1.1s", dur: "3s" },
  { ch: "💖", left: "8%", top: "84%", size: 18, delay: "2.1s", dur: "3.4s" },
  { ch: "⭐", left: "47%", top: "88%", size: 16, delay: "1.6s", dur: "2.7s" },
];

export function Hero() {
  const heroUrl = useCutout("/hero.jpeg");

  return (
    <>
      <div className="hero2">
        <div className="hero2-glow g1" />
        <div className="hero2-glow g2" />
        <div className="hero2-glow g3" />

        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="spark"
            style={{
              left: s.left,
              top: s.top,
              fontSize: s.size,
              animationDelay: s.delay,
              animationDuration: s.dur,
            }}
          >
            {s.ch}
          </span>
        ))}

        {heroUrl === "" && <span className="hero2-fallback">🧒👧🐶🐧</span>}
        {heroUrl && <img src={heroUrl} alt="" className="hero2-img" />}

        <div className="hero2-bubble">
          <h1>⭐ Hello, Little Explorer!</h1>
          <p>Small steps... Big dreams! 💜</p>
        </div>
      </div>

      <div className="mascot-row">
        <Pic src="/cat.jpeg" emoji="🐱" className="mascot-img" />
        <div className="mascot-bubble">
          Hi! I'm Nimo 💙
          <br />
          Your learning buddy. Let's explore!
        </div>
      </div>
    </>
  );
}

export function ExploreGrid({ onCard }) {
  return (
    <div className="explore-row">
      {CARDS.map((c) => (
        <button
          key={c.key}
          className={"explore-card " + c.color}
          onClick={() => onCard(c)}
        >
          <Pic
            src={"/cards/" + c.key + ".png"}
            emoji={c.emoji}
            className="explore-img"
          />
          <span className="explore-title">{c.title}</span>
          <span className="explore-sub">{c.sub}</span>
        </button>
      ))}
    </div>
  );
}

export function BoardPanel({ tab, setTab, onSay, full }) {
  return (
    <div className="panel board-panel">
      <Pic src="/girl.jpeg" emoji="👧" className="board-girl" />
      <h3>💬 Communication Board</h3>
      <p className="muted small">Tap a button to communicate</p>

      <div className="tabs">
        {Object.keys(BOARD).map((t) => (
          <button
            key={t}
            className={tab === t ? "tab active" : "tab"}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={full ? "board-grid big" : "board-grid"}>
        {BOARD[tab].map((b) => (
          <button
            key={b.text}
            className={"board-btn " + b.color}
            onClick={() => onSay(b.text, b.icon)}
          >
            <span className="board-icon">{b.icon}</span>
            <span>{b.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function HistoryList({ history, limit, onViewAll }) {
  const items = history.slice(0, limit || 50);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>🕒 {limit ? "Recent Activity" : "History"}</h3>
        {limit && (
          <button className="link-btn" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="muted">No activity yet. Tap a button or use the camera.</p>
      )}

      {items.map((h, i) => (
        <div className="history-item" key={i}>
          <span className="history-icon">{h.icon}</span>
          <span className="history-text">{h.text}</span>
          <span className="muted small">{h.time}</span>
        </div>
      ))}
    </div>
  );
}

export function QuickActions({ go, openCamera }) {
  return (
    <div className="panel">
      <h3>✨ Quick Actions</h3>
      <button className="quick-btn" onClick={() => go("history")}>
        🕒 View History
      </button>
      <button className="quick-btn" onClick={() => go("caregiver")}>
        🎯 Manage Goals
      </button>
      <button className="quick-btn" onClick={openCamera}>
        📷 Open Camera
      </button>
      <button className="quick-btn yellow" onClick={() => go("play")}>
        🎮 Play & Learn
      </button>
    </div>
  );
}

export function ProfileCard() {
  return (
    <div className="panel profile-card">
      <Pic src="/girl.jpeg" emoji="🧒" className="avatar-img" />
      <h3>Aarvi</h3>
      <p className="muted">Age: 6 • Child Mode</p>
      <p className="chips">
        <span>⭐ Brave</span>
        <span>💜 Kind</span>
        <span>🧠 Smart</span>
      </p>
    </div>
  );
}