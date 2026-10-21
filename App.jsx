import { useEffect, useRef, useState } from "react";
import GestureCollector from "./GestureCollector";
import Sidebar from "./sidebar";
import { speak } from "./data";
import { PlayView, ProfileView, GoalsView } from "./extras";
import CuesView from "./cues";
import Trainer from "./trainer";
import {
  Hero,
  ExploreGrid,
  BoardPanel,
  HistoryList,
  QuickActions,
} from "./parts";
import "./App.css";

const API = "http://localhost:3001/api";

const call = (method, url, body) =>
  fetch(API + url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());

const DEFAULT_GOALS = [
  { id: "g1", title: "Learn new words", done: 2, target: 5 },
  { id: "g2", title: "Play memory game daily", done: 0, target: 1 },
  { id: "g3", title: "Express basic needs", done: 3, target: 5 },
  { id: "g4", title: "Follow daily routine", done: 4, target: 7 },
];

const DEFAULT_CUES = [
  { id: "c1", name: "Pointing at water", message: "I am thirsty", emoji: "💧", keyword: "THIRSTY", active: true },
  { id: "c2", name: "Hand to mouth", message: "I am hungry", emoji: "🍔", keyword: "HUNGRY", active: true },
  { id: "c3", name: "Waving hand", message: "Hello", emoji: "👋", keyword: "", active: true },
];

const clock = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function App() {
  const [view, setView] = useState("home");
  const [tab, setTab] = useState("Basics");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [plays, setPlays] = useState([]);
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [cues, setCues] = useState(DEFAULT_CUES);
  const [profile, setProfile] = useState(null);
  const [now, setNow] = useState(new Date());
  const lastGesture = useRef({ text: "", time: 0 });
  const cuesRef = useRef(DEFAULT_CUES);

  useEffect(() => {
    cuesRef.current = cues;
  }, [cues]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    call("GET", "/all")
      .then((d) => {
        if (Array.isArray(d.history)) setHistory(d.history.slice(0, 50));
        if (Array.isArray(d.plays)) setPlays(d.plays);
        if (Array.isArray(d.goals)) setGoals(d.goals);
        if (Array.isArray(d.cues)) setCues(d.cues);
        if (d.profile) setProfile(d.profile);
      })
      .catch(() => {});
  }, []);

  const addHistory = (text, icon, source) => {
    const time = clock();
    setHistory((h) => [{ text, icon, time, source }, ...h].slice(0, 50));
    call("POST", "/history", { text, icon, time, source }).catch(() => {});
  };

  const say = (text, icon = "💬", source = "tap") => {
    speak(text);
    addHistory(text, icon, source);
  };

  const handleGesture = (meaning) => {
    const m = String(meaning || "").toUpperCase();
    let text = null;
    let icon = "📷";

    if (m.includes("THIRSTY")) {
      text = "I am thirsty";
      icon = "💧";
    } else if (m.includes("HUNGRY")) {
      text = "I am hungry";
      icon = "🍔";
    } else if (m.includes("UNCOMFORTABLE")) {
      text = "I am feeling uncomfortable";
      icon = "😣";
    } else {
      const c = cuesRef.current.find(
        (x) => x.active && x.keyword && m.includes(x.keyword.toUpperCase())
      );
      if (c) {
        text = c.message;
        icon = c.emoji;
      }
    }

    if (!text) return;

    const t = Date.now();
    if (
      lastGesture.current.text === text &&
      t - lastGesture.current.time < 4000
    ) {
      return;
    }
    lastGesture.current = { text: text, time: t };
    say(text, icon, "camera");
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      say("Hello", "🎤");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.onresult = (e) => {
      addHistory(e.results[0][0].transcript, "🎤", "voice");
    };
    rec.start();
  };

  const handleNav = (id) => {
    if (id === "camera") setCameraOpen(true);
    else setView(id);
  };

  const handleCard = (card) => {
    if (card.action === "camera") setCameraOpen(true);
    else say(card.say, card.emoji);
  };

  const bumpGoal = (g, step) => {
    const done = Math.max(0, g.done + step);
    setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, done } : x)));
    call("PUT", "/goals/" + g.id, { done }).catch(() => {});
  };

  const finishGame = (game, result) => {
    const time = clock();
    setPlays((p) => [{ game, result, time }, ...p]);
    call("POST", "/plays", { game, result, time }).catch(() => {});
    addHistory("Played " + game + " – " + result, "🎮", "game");
    const g = goals.find((x) => /game/i.test(x.title));
    if (g) bumpGoal(g, 1);
  };

  const saveProfile = (p) => {
    setProfile(p);
    call("PUT", "/profile", p).catch(() => {});
  };

  const addGoal = (title, target) => {
    call("POST", "/goals", { title, target })
      .then((g) => setGoals((gs) => [...gs, g]))
      .catch(() =>
        setGoals((gs) => [
          ...gs,
          { id: "l" + Date.now(), title, done: 0, target: Number(target) || 5 },
        ])
      );
  };
  const deleteGoal = (g) => {
    setGoals((gs) => gs.filter((x) => x.id !== g.id));
    call("DELETE", "/goals/" + g.id).catch(() => {});
  };

  const addCue = (c) => {
    call("POST", "/cues", c)
      .then((saved) => setCues((cs) => [...cs, saved]))
      .catch(() =>
        setCues((cs) => [...cs, { ...c, id: "l" + Date.now(), active: true }])
      );
  };
  const toggleCue = (c) => {
    const active = !c.active;
    setCues((cs) => cs.map((x) => (x.id === c.id ? { ...x, active } : x)));
    call("PUT", "/cues/" + c.id, { active }).catch(() => {});
  };
  const deleteCue = (c) => {
    setCues((cs) => cs.filter((x) => x.id !== c.id));
    call("DELETE", "/cues/" + c.id).catch(() => {});
  };
  const testCue = (c) => speak(c.message);
  const fireCue = (c) => say(c.message, c.emoji, "cue");

  // called by the trainer when it recognises one of the child's own gestures
  const fireTrained = (message, emoji) => say(message, emoji, "camera");

  const cameraCount = history.filter(
    (h) => h.source === "camera" || h.source === "cue"
  ).length;
  const goalsDone = goals.filter((g) => g.done >= g.target).length;
  const childName = profile?.name || "your child";
  const activeCues = cues.filter((c) => c.active);

  const dateText = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeText = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const renderView = () => {
    if (view === "home") {
      return (
        <>
          <Hero />

          <div className="panel explore-panel">
            <h2 className="section-title">⭐ Explore & Play</h2>
            <ExploreGrid onCard={handleCard} />
          </div>

          <div className="voice-row">
            <button className="voice-bar" onClick={startListening}>
              🎤 Tap to speak...
            </button>
            <button
              className="voice-out"
              onClick={() => speak("Voice output is on")}
            >
              🔊 Voice Output
            </button>
          </div>

          <div className="two-col">
            <BoardPanel tab={tab} setTab={setTab} onSay={say} />
            <div className="side-col">
              <QuickActions
                go={(v) => setView(v === "caregiver" ? "goals" : v)}
                openCamera={() => setCameraOpen(true)}
              />
              <HistoryList
                history={history}
                limit={4}
                onViewAll={() => setView("history")}
              />
            </div>
          </div>
        </>
      );
    }

    if (view === "child") {
      return (
        <>
          <h2 className="section-title">🧒 Child Mode</h2>
          <ExploreGrid onCard={handleCard} />
          <div style={{ height: 18 }} />
          <BoardPanel tab={tab} setTab={setTab} onSay={say} full />
        </>
      );
    }

    if (view === "caregiver") {
      return (
        <>
          <h2 className="section-title">💜 Caregiver Dashboard</h2>
          <p className="muted">Quick overview of {childName}'s progress</p>

          <div className="stats">
            <div className="stat panel">
              <div className="stat-num">{history.length}</div>
              <div className="muted">Communications</div>
            </div>
            <div className="stat panel">
              <div className="stat-num">{cameraCount}</div>
              <div className="muted">Camera & cue detections</div>
            </div>
            <div className="stat panel">
              <div className="stat-num">{plays.length}</div>
              <div className="muted">Games played</div>
            </div>
            <div className="stat panel">
              <div className="stat-num">
                {goalsDone}/{goals.length}
              </div>
              <div className="muted">Goals completed</div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="panel-head">
              <h3>🎯 Progress & Goals</h3>
              <button className="link-btn" onClick={() => setView("goals")}>
                Manage
              </button>
            </div>
            <div className="goals">
              {goals.map((g, i) => (
                <span
                  key={g.id}
                  className={"goal " + ["c-orange", "c-purple", "c-pink", "c-teal"][i % 4]}
                >
                  {g.title} {g.done}/{g.target}
                </span>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="panel-head">
              <h3>🖐️ Custom Cues ({cues.length})</h3>
              <button className="link-btn" onClick={() => setView("cues")}>
                Manage
              </button>
            </div>
            <p className="muted small">
              Add your child's own gestures and what they mean.
            </p>
            <button
              className="btn primary"
              style={{ marginTop: 10 }}
              onClick={() => setView("train")}
            >
              🎓 Train my own gestures
            </button>
          </div>

          <HistoryList history={history} />
        </>
      );
    }

    if (view === "goals") {
      return (
        <GoalsView
          goals={goals}
          onAdd={addGoal}
          onBump={bumpGoal}
          onDelete={deleteGoal}
        />
      );
    }

    if (view === "cues") {
      return (
        <>
          <button
            className="btn primary"
            style={{ marginBottom: 14 }}
            onClick={() => setView("train")}
          >
            🎓 Train my own gestures with the camera
          </button>
          <CuesView
            cues={cues}
            onAdd={addCue}
            onToggle={toggleCue}
            onDelete={deleteCue}
            onTest={testCue}
          />
        </>
      );
    }

    if (view === "train") {
      return <Trainer onFire={fireTrained} />;
    }

    if (view === "board") {
      return <BoardPanel tab={tab} setTab={setTab} onSay={say} full />;
    }

    if (view === "history") {
      return (
        <>
          <h2 className="section-title">🕒 History</h2>
          <HistoryList history={history} />
        </>
      );
    }

    if (view === "play") {
      return <PlayView plays={plays} onFinish={finishGame} />;
    }

    if (view === "profile") {
      return (
        <ProfileView
          key={profile ? profile.name : "new"}
          profile={profile}
          onSave={saveProfile}
        />
      );
    }

    return (
      <>
        <h2 className="section-title">⚙️ Settings</h2>
        <div className="panel">
          <div className="setting-row">
            <span>Preferred Language</span>
            <span className="muted">{profile?.language || "English"}</span>
          </div>
          <div className="setting-row">
            <span>Communication Style</span>
            <span className="muted">{profile?.style || "Voice + Touch"}</span>
          </div>
          <div className="setting-row">
            <span>Mode</span>
            <span className="muted">{profile?.mode || "Child Mode"}</span>
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => setView("profile")}>
              ✏️ Change in Profile
            </button>
            <button className="btn" onClick={() => setView("cues")}>
              🖐️ Custom Cues
            </button>
            <button className="btn" onClick={() => setView("train")}>
              🎓 Train Gestures
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="app">
      <Sidebar page={view} go={handleNav} />

      <main className="main">
        <div className="topbar">
          <span>
            {dateText} • {timeText}
          </span>
        </div>
        {renderView()}
      </main>

      {cameraOpen && (
        <div className="modal-backdrop" onClick={() => setCameraOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setCameraOpen(false)}
            >
              ✕
            </button>
            <GestureCollector onDetect={handleGesture} />

            <div className="cue-bar">
              <div className="cue-bar-head">
                <strong>🖐️ Custom cues</strong>
                <button
                  className="link-btn"
                  onClick={() => {
                    setCameraOpen(false);
                    setView("train");
                  }}
                >
                  🎓 Train
                </button>
              </div>
              <p className="muted small">
                Tap a cue when your child makes that gesture.
              </p>
              <div className="cue-chips">
                {activeCues.length === 0 && (
                  <span className="muted small">No active cues yet.</span>
                )}
                {activeCues.map((c) => (
                  <button
                    key={c.id}
                    className="cue-chip"
                    onClick={() => fireCue(c)}
                  >
                    <span>{c.emoji}</span> {c.message}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;