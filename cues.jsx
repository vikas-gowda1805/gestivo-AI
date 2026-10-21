import { useState } from "react";

const EMOJIS = ["💧", "🍔", "👋", "😊", "😢", "😴", "🚽", "🎮", "🤗", "🙏", "❤️", "🆘", "👍", "👎", "🎵", "📺"];

export default function CuesView({ cues = [], onAdd, onToggle, onDelete, onTest }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [emoji, setEmoji] = useState("💬");

  const submit = () => {
    if (!name.trim() || !message.trim()) return;
    onAdd({ name: name.trim(), message: message.trim(), keyword: keyword.trim(), emoji });
    setName("");
    setMessage("");
    setKeyword("");
    setEmoji("💬");
  };

  return (
    <>
      <h2 className="section-title">🖐️ Custom Cues</h2>
      <p className="muted">
        Teach the app your child's own gestures. Add a cue, then tap it in the
        camera window whenever the child makes that gesture.
      </p>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <h3>Active Cue Mappings ({cues.length})</h3>
        </div>

        {cues.length === 0 && <p className="muted">No cues yet. Add one below.</p>}

        {cues.map((c) => (
          <div className="cue-row" key={c.id}>
            <span className="cue-emoji">{c.emoji}</span>
            <div className="cue-text">
              <strong>"{c.message}"</strong>
              <div className="muted small">
                {c.name}
                {c.keyword ? " • keyword: " + c.keyword : ""}
              </div>
            </div>
            <button className="btn" onClick={() => onTest(c)}>🔊 Test</button>
            <button
              className={"cue-badge" + (c.active ? " on" : "")}
              onClick={() => onToggle(c)}
            >
              {c.active ? "ACTIVE" : "OFF"}
            </button>
            <button className="btn" onClick={() => onDelete(c)}>🗑</button>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>➕ Add New Cue</h3>
        <div className="form-col">
          <label>Gesture (describe it)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Taps tummy twice" />
          <label>Message to say</label>
          <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. I am hungry" />
          <label>Camera keyword (optional)</label>
          <input className="input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. HUNGRY" />
          <label>Pick an emoji</label>
          <div className="emoji-pick">
            {EMOJIS.map((e) => (
              <button
                key={e}
                className={"emoji-btn" + (emoji === e ? " sel" : "")}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={submit}>💾 Save Cue</button>
        </div>
      </div>
    </>
  );
}