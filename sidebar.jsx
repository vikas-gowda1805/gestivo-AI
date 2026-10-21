import { useState } from "react";

const Tile = ({ children, bg }) => (
  <span className="nav-tile" style={{ background: bg }}>{children}</span>
);

function ChildIcon() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="nav-tile nav-tile-photo nav-tile-fallback">👧</span>
    );
  }
  return (
    <img
      src="/girl.jpeg"
      alt=""
      className="nav-tile nav-tile-photo"
      onError={() => setFailed(true)}
    />
  );
}

const ICONS = {
  home: (
    <Tile bg="linear-gradient(160deg,#6ec6ff,#2d7bff)">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="#fff" />
      </svg>
    </Tile>
  ),
  child: <ChildIcon />,
  caregiver: (
    <Tile bg="linear-gradient(160deg,#f1e4ff,#c9a8ff)">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#9b5cff" stroke="#fff" strokeWidth="1.2" />
      </svg>
    </Tile>
  ),
  board: (
    <Tile bg="linear-gradient(160deg,#8fd0ff,#3b8cff)">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fff" />
        <circle cx="8.5" cy="10.5" r="1.3" fill="#3b8cff" />
        <circle cx="12" cy="10.5" r="1.3" fill="#3b8cff" />
        <circle cx="15.5" cy="10.5" r="1.3" fill="#3b8cff" />
      </svg>
    </Tile>
  ),
  train: (
    <Tile bg="linear-gradient(160deg,#ffb3e6,#a66bff)">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11h.5V4.5a1.5 1.5 0 0 1 3 0V11h.5V6a1.5 1.5 0 0 1 3 0v8.5c0 3.6-2.4 6.5-6 6.5-2.4 0-3.9-1.2-5.100-3.200L4.800 14a1.400 1.400 0 0 1 2.300-1.600z" fill="#fff" />
        <path d="M19.500 2.500l.6 1.400 1.400.6-1.400.6-.6 1.400-.6-1.400-1.400-.6 1.400-.6z" fill="#ffe066" />
      </svg>
    </Tile>
  ),
  history: (
    <Tile bg="linear-gradient(160deg,#cfe6ff,#7fb2ff)">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <circle cx="12" cy="12" r="9" fill="#fff" stroke="#3b6fff" strokeWidth="2" />
        <path d="M12 6.5V12l4 2.5" stroke="#3b6fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </Tile>
  ),
  profile: (
    <Tile bg="linear-gradient(160deg,#d9e6ff,#8fb0ff)">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <circle cx="12" cy="8" r="4" fill="#3b4fd8" />
        <path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7z" fill="#3b4fd8" />
      </svg>
    </Tile>
  ),
  settings: (
    <Tile bg="linear-gradient(160deg,#cfe0ff,#6f9bff)">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M12 2l1.8 2.6 3.1-.6.9 3 2.9 1.3-.9 3 1.7 2.7-2.4 2.1.1 3.1-3.1.6L12 22l-1.8-2.6-3.1.6-.9-3-2.9-1.3.9-3L2.5 9.7l2.4-2.1-.1-3.1 3.1-.6z" fill="#2d5bff" />
        <circle cx="12" cy="12" r="3.2" fill="#fff" />
      </svg>
    </Tile>
  ),
};

const ITEMS = [
  ["home", "Home"],
  ["child", "Child Mode"],
  ["caregiver", "Caregiver Mode"],
  ["board", "Communication Board"],
  ["train", "Train Gestures"],
  ["history", "History"],
  ["profile", "Profile"],
  ["settings", "Settings"],
];

export default function Sidebar({ page, go }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-star">🌟</span>
        <div>
          <div className="logo-name">DreamWeave</div>
          <div className="small muted">Play • Learn • Grow</div>
        </div>
      </div>

      {ITEMS.map(([id, label]) => (
        <button
          key={id}
          className={"nav-btn" + (page === id ? " active" : "")}
          onClick={() => go(id)}
        >
          {ICONS[id]}
          <span>{label}</span>
        </button>
      ))}
    </aside>
  );
}