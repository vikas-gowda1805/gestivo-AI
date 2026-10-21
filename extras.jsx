import { useEffect, useRef, useState } from "react";
import { speak } from "./data";
import { Pic } from "./parts";

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// removes emojis so the voice doesn't read them out
const noEmoji = (t) =>
  t
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/* ---------------- Memory game ---------------- */
const FACES = ["🐶", "🐱", "🐰", "🐼", "🦁", "🐸"];

function Memory({ onDone }) {
  const [cards] = useState(() =>
    shuffle([...FACES, ...FACES].map((f, i) => ({ id: i, f })))
  );
  const [open, setOpen] = useState([]);
  const [done, setDone] = useState([]);
  const [moves, setMoves] = useState(0);
  const finished = useRef(false);

  const flip = (i) => {
    if (open.length === 2 || open.includes(i) || done.includes(cards[i].f)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].f === cards[b].f) {
        setTimeout(() => {
          setDone((d) => [...d, cards[a].f]);
          setOpen([]);
        }, 400);
      } else {
        setTimeout(() => setOpen([]), 800);
      }
    }
  };

  useEffect(() => {
    if (done.length === FACES.length && !finished.current) {
      finished.current = true;
      setTimeout(() => onDone("Finished in " + moves + " moves"), 500);
    }
    // eslint-disable-next-line
  }, [done]);

  return (
    <div>
      <p className="muted">Find the matching pairs! Moves: {moves}</p>
      <div className="mem-grid">
        {cards.map((c, i) => {
          const show = open.includes(i) || done.includes(c.f);
          return (
            <button
              key={c.id}
              className={"mem-card" + (show ? " show" : "")}
              onClick={() => flip(i)}
            >
              {show ? c.f : "❓"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Quiz (shapes + animals) ---------------- */
function Quiz({ questions, onDone }) {
  const [qs] = useState(questions);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const q = qs[i];

  useEffect(() => {
    speak(noEmoji(q.say));
    // eslint-disable-next-line
  }, [i]);

  const pick = (o) => {
    if (picked) return;
    setPicked(o.label);
    const right = o.label === q.answer;
    const newScore = score + (right ? 1 : 0);
    if (right) setScore(newScore);
    setTimeout(() => {
      if (i + 1 >= qs.length) onDone("Score " + newScore + "/" + qs.length);
      else {
        setI(i + 1);
        setPicked(null);
      }
    }, 900);
  };

  return (
    <div>
      <p className="muted">
        Question {i + 1} of {qs.length} • Score {score}
      </p>
      <h2 className="quiz-q">{q.prompt}</h2>
      <div className="quiz-opts">
        {q.options.map((o) => {
          let cls = "quiz-opt";
          if (picked && o.label === q.answer) cls += " right";
          else if (picked === o.label) cls += " wrong";
          return (
            <button key={o.label} className={cls} onClick={() => pick(o)}>
              <span className="quiz-emoji">{o.e}</span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SHAPES = [
  { label: "Circle", e: "🔴" },
  { label: "Square", e: "🟦" },
  { label: "Triangle", e: "🔺" },
  { label: "Star", e: "⭐" },
  { label: "Heart", e: "💜" },
];
const makeShapeQs = () =>
  shuffle(SHAPES)
    .slice(0, 5)
    .map((t) => {
      const others = shuffle(SHAPES.filter((s) => s.label !== t.label)).slice(0, 3);
      return {
        prompt: "Tap the " + t.label,
        say: "Tap the " + t.label,
        answer: t.label,
        options: shuffle([t, ...others]),
      };
    });

const ANIMALS = [
  { label: "Dog", e: "🐶", s: "Woof woof" },
  { label: "Cat", e: "🐱", s: "Meow" },
  { label: "Cow", e: "🐮", s: "Moo" },
  { label: "Duck", e: "🦆", s: "Quack" },
  { label: "Lion", e: "🦁", s: "Roar" },
  { label: "Sheep", e: "🐑", s: "Baa" },
];
const makeAnimalQs = () =>
  shuffle(ANIMALS)
    .slice(0, 5)
    .map((t) => {
      const others = shuffle(ANIMALS.filter((s) => s.label !== t.label)).slice(0, 2);
      return {
        prompt: 'Who says "' + t.s + '"?',
        say: t.s,
        answer: t.label,
        options: shuffle([t, ...others]),
      };
    });

/* ---------------- Story time ---------------- */
const STORY = [
  "🌟 Once upon a time, a little star named Nimo lived high in the sky.",
  "🐱 One night, Nimo saw a sleepy kitten who could not find her way home.",
  "✨ Nimo shone very bright and lit up the path through the garden.",
  "🏠 The kitten found her home and said, thank you, Nimo!",
  "💜 Nimo smiled. Helping others makes everyone happy. The End.",
];

function Story({ onDone }) {
  const [p, setP] = useState(0);
  const last = p === STORY.length - 1;
  return (
    <div>
      <p className="muted">
        Page {p + 1} of {STORY.length}
      </p>
      <div className="story-page">{STORY[p]}</div>
      <div className="btn-row">
        <button className="btn" onClick={() => speak(noEmoji(STORY[p]))}>
          🔊 Read to me
        </button>
        {p > 0 && (
          <button className="btn" onClick={() => setP(p - 1)}>
            ◀ Back
          </button>
        )}
        {!last && (
          <button className="btn primary" onClick={() => setP(p + 1)}>
            Next ▶
          </button>
        )}
        {last && (
          <button className="btn primary" onClick={() => onDone("Finished the story")}>
            ✅ The End
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Play & Learn page ---------------- */
const GAME_LIST = [
  { id: "memory", title: "Memory Game", sub: "Boost memory", e: "🧠", color: "c-purple" },
  { id: "shape", title: "Shape Match", sub: "Learn shapes", e: "🔺", color: "c-orange" },
  { id: "animal", title: "Animal Sounds", sub: "Explore sounds", e: "🦁", color: "c-green" },
  { id: "story", title: "Story Time", sub: "Listen & imagine", e: "📖", color: "c-pink" },
];

export function PlayView({ plays, onFinish }) {
  const [game, setGame] = useState(null);
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);

  const start = (g) => {
    setGame(g);
    setResult(null);
    setRound((r) => r + 1);
  };

  const done = (text) => {
    setResult(text);
    onFinish(game.title, text);
  };

  if (game) {
    return (
      <>
        <button className="btn" onClick={() => setGame(null)}>
          ◀ All games
        </button>
        <h2 className="section-title">
          {game.e} {game.title}
        </h2>
        <div className="panel game-panel">
          {result ? (
            <div className="game-result">
              <div className="big">🎉</div>
              <h2>Great job!</h2>
              <p className="muted">{result}</p>
              <div className="btn-row">
                <button className="btn primary" onClick={() => start(game)}>
                  🔁 Play again
                </button>
                <button className="btn" onClick={() => setGame(null)}>
                  🎮 Other games
                </button>
              </div>
            </div>
          ) : (
            <>
              {game.id === "memory" && <Memory key={round} onDone={done} />}
              {game.id === "shape" && (
                <Quiz key={round} questions={makeShapeQs()} onDone={done} />
              )}
              {game.id === "animal" && (
                <Quiz key={round} questions={makeAnimalQs()} onDone={done} />
              )}
              {game.id === "story" && <Story key={round} onDone={done} />}
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="section-title">🎮 Play & Learn</h2>
      <p className="muted">Fun activities to build skills! Tap a game to start.</p>
      <div className="explore-row">
        {GAME_LIST.map((g) => (
          <button
            key={g.id}
            className={"explore-card " + g.color}
            onClick={() => start(g)}
          >
            <span className="explore-img">{g.e}</span>
            <span className="explore-title">{g.title}</span>
            <span className="explore-sub">{g.sub}</span>
          </button>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>🕒 Games played</h3>
        {plays.length === 0 && <p className="muted">No games played yet.</p>}
        {plays.slice(0, 10).map((p, i) => (
          <div className="history-item" key={i}>
            <span className="history-icon">🎮</span>
            <span className="history-text">
              {p.game} – {p.result}
            </span>
            <span className="muted small">{p.time}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Profile ---------------- */
export function ProfileView({ profile, onSave }) {
  const [editing, setEditing] = useState(!profile);
  const [name, setName] = useState(profile?.name || "");
  const [age, setAge] = useState(profile?.age || "");
  const [mode, setMode] = useState(profile?.mode || "Child Mode");
  const [language, setLanguage] = useState(profile?.language || "English");
  const [style, setStyle] = useState(profile?.style || "Voice + Touch");

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), age, mode, language, style });
    setEditing(false);
  };

  if (!editing && profile) {
    return (
      <>
        <h2 className="section-title">👤 Profile & Settings</h2>
        <div className="panel profile-card">
          <Pic src="/girl.jpeg" emoji="🧒" className="avatar-img" />
          <h3>{profile.name}</h3>
          <p className="muted">
            Age: {profile.age || "-"} • {profile.mode}
          </p>
          <div className="setting-row">
            <span>Preferred Language</span>
            <span className="muted">{profile.language}</span>
          </div>
          <div className="setting-row">
            <span>Communication Style</span>
            <span className="muted">{profile.style}</span>
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 14 }}
            onClick={() => setEditing(true)}
          >
            ✏️ Edit Profile
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="section-title">
        👤 {profile ? "Edit Profile" : "Create Profile"}
      </h2>
      <div className="panel profile-card">
        <Pic src="/girl.jpeg" emoji="🧒" className="avatar-img" />
        <div className="form-col">
          <label>Child's name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aarvi"
          />
          <label>Age</label>
          <input
            className="input"
            type="number"
            min="1"
            max="18"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 6"
          />
          <label>Mode</label>
          <select
            className="input"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option>Child Mode</option>
            <option>Caregiver Mode</option>
          </select>
          <label>Preferred language</label>
          <select
            className="input"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Tamil</option>
            <option>Telugu</option>
          </select>
          <label>Communication style</label>
          <select
            className="input"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option>Voice + Touch</option>
            <option>Touch only</option>
            <option>Voice only</option>
          </select>
          <button className="btn primary" onClick={submit}>
            💾 Save Profile
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------------- Goals ---------------- */
export function GoalsView({ goals, onAdd, onBump, onDelete }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(5);

  return (
    <>
      <h2 className="section-title">🎯 Manage Goals</h2>
      <div className="panel">
        {goals.length === 0 && (
          <p className="muted">No goals yet. Add one below.</p>
        )}
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.done / g.target) * 100));
          return (
            <div className="goal-row" key={g.id}>
              <div className="goal-top">
                <strong>{g.title}</strong>
                <span className="muted">
                  {g.done}/{g.target}
                </span>
              </div>
              <div className="progress">
                <div className="progress-fill" style={{ width: pct + "%" }} />
              </div>
              <div className="btn-row">
                <button className="btn" onClick={() => onBump(g, -1)}>
                  ➖
                </button>
                <button className="btn primary" onClick={() => onBump(g, 1)}>
                  ➕ Progress
                </button>
                <button className="btn" onClick={() => onDelete(g)}>
                  🗑 Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>➕ Add a goal</h3>
        <div className="form-col">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal name"
          />
          <input
            className="input"
            type="number"
            min="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <button
            className="btn primary"
            onClick={() => {
              if (!title.trim()) return;
              onAdd(title.trim(), target);
              setTitle("");
            }}
          >
            Add Goal
          </button>
        </div>
      </div>
    </>
  );
}