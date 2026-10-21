import { useEffect, useRef, useState } from "react";

const W = 16;
const H = 12;
const KEY = "dw_trained_gestures_v1";
const EMOJIS = ["😊", "😢", "😡", "😴", "💧", "🍔", "🚽", "🎮", "🤗", "🙏", "❤️", "🆘", "👍", "👎", "👋", "✌️"];

const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch (e) {
    return [];
  }
};
const store = (g) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch (e) {}
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function feature(video, ctx) {
  ctx.drawImage(video, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const f = [];
  for (let i = 0; i < d.length; i += 4) {
    f.push(d[i], d[i + 1], d[i + 2]);
  }
  let mean = 0;
  for (let i = 0; i < f.length; i++) mean += f[i];
  mean /= f.length;
  return f.map((v) => Math.round((v - mean) * 10) / 10);
}

function dist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - b[i];
    s += x * x;
  }
  return Math.sqrt(s / a.length);
}

// returns the closest trained gesture and how far it is
function classify(f, gestures) {
  let best = null;
  let bestD = Infinity;
  gestures.forEach((g) => {
    g.samples.forEach((s) => {
      const d = dist(f, s);
      if (d < bestD) {
        bestD = d;
        best = g;
      }
    });
  });
  return { best, d: bestD };
}

export default function Trainer({ onFire }) {
  const [gestures, setGestures] = useState(loadSaved);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("😊");
  const [camOn, setCamOn] = useState(false);
  const [detect, setDetect] = useState(true);
  const [thresh, setThresh] = useState(25);
  const [status, setStatus] = useState("");
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);

  const videoRef = useRef(null);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const gesturesRef = useRef(gestures);
  const busyRef = useRef(false);
  const threshRef = useRef(thresh);
  const streak = useRef({ id: null, n: 0 });
  const lastFire = useRef(0);
  const onFireRef = useRef(onFire);

  useEffect(() => {
    gesturesRef.current = gestures;
  }, [gestures]);
  useEffect(() => {
    threshRef.current = thresh;
  }, [thresh]);
  useEffect(() => {
    onFireRef.current = onFire;
  }, [onFire]);

  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    ctxRef.current = c.getContext("2d", { willReadFrequently: true });
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCamOn(true);
      setStatus("Camera is on.");
    } catch (e) {
      setStatus("Could not open the camera. Allow camera permission and close other camera windows.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    setCamOn(false);
    setLive("");
  };

  const save = (next) => {
    store(next);
    setGestures(next);
  };

  const recordSamples = async (id, label) => {
    if (!camOn || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    for (let c = 3; c >= 1; c--) {
      setStatus("Get ready to show \"" + label + "\"... " + c);
      await sleep(1000);
    }
    const frames = [];
    for (let i = 0; i < 25; i++) {
      setStatus("Recording \"" + label + "\"... hold it and move slightly (" + (i + 1) + "/25)");
      if (videoRef.current) frames.push(feature(videoRef.current, ctxRef.current));
      await sleep(100);
    }
    const next = gesturesRef.current.map((g) =>
      g.id === id ? { ...g, samples: [...g.samples, ...frames].slice(-120) } : g
    );
    save(next);
    setStatus("Saved! \"" + label + "\" now has " + next.find((g) => g.id === id).samples.length + " samples.");
    busyRef.current = false;
    setBusy(false);
  };

  const addGesture = async () => {
    if (!camOn) {
      setStatus("Turn the camera on first.");
      return;
    }
    if (!name.trim() || !message.trim()) {
      setStatus("Enter a gesture name and the message to say.");
      return;
    }
    const g = {
      id: "t" + Date.now(),
      name: name.trim(),
      message: message.trim(),
      emoji,
      neutral: false,
      samples: [],
    };
    const next = [...gesturesRef.current, g];
    save(next);
    gesturesRef.current = next;
    setName("");
    setMessage("");
    await recordSamples(g.id, g.name);
  };

  const addNeutral = async () => {
    if (!camOn) {
      setStatus("Turn the camera on first.");
      return;
    }
    let g = gesturesRef.current.find((x) => x.neutral);
    if (!g) {
      g = {
        id: "neutral",
        name: "Nothing (resting)",
        message: "",
        emoji: "😐",
        neutral: true,
        samples: [],
      };
      const next = [...gesturesRef.current, g];
      save(next);
      gesturesRef.current = next;
    }
    await recordSamples(g.id, "Nothing (just sit normally)");
  };

  const remove = (g) => {
    save(gesturesRef.current.filter((x) => x.id !== g.id));
  };

  const clearAll = () => {
    if (window.confirm("Delete all trained gestures?")) save([]);
  };

  // live detection
  useEffect(() => {
    if (!camOn || !detect) return;
    const timer = setInterval(() => {
      if (busyRef.current || !videoRef.current) return;
      const list = gesturesRef.current.filter((g) => g.samples.length > 0);
      if (list.length === 0) return;
      const f = feature(videoRef.current, ctxRef.current);
      const { best, d } = classify(f, list);
      if (!best) return;

      const ok = !best.neutral && d < threshRef.current;
      setLive(
        (ok ? "Looks like: " + best.name : "Closest: " + best.name) +
          " (distance " + d.toFixed(1) + ")"
      );

      if (ok) {
        if (streak.current.id === best.id) streak.current.n += 1;
        else streak.current = { id: best.id, n: 1 };
        if (streak.current.n >= 4 && Date.now() - lastFire.current > 4000) {
          lastFire.current = Date.now();
          streak.current = { id: null, n: 0 };
          if (onFireRef.current) onFireRef.current(best.message, best.emoji);
        }
      } else {
        streak.current = { id: null, n: 0 };
      }
    }, 250);
    return () => clearInterval(timer);
  }, [camOn, detect]);

  const hasNeutral = gestures.some((g) => g.neutral && g.samples.length > 0);

  return (
    <>
      <h2 className="section-title">🎓 Train My Own Gestures</h2>
      <p className="muted">
        Show a gesture, give it a name and a message, and the app learns it.
        Later it says the message when it sees that gesture again.
      </p>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="btn-row" style={{ marginTop: 0 }}>
          {!camOn ? (
            <button className="btn primary" onClick={startCamera}>
              📷 Turn camera on
            </button>
          ) : (
            <button className="btn" onClick={stopCamera}>
              ⏹ Turn camera off
            </button>
          )}
          <button
            className={"cue-badge" + (detect ? " on" : "")}
            onClick={() => setDetect(!detect)}
          >
            {detect ? "AUTO-DETECT ON" : "AUTO-DETECT OFF"}
          </button>
        </div>

        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: "100%",
            maxWidth: 520,
            marginTop: 14,
            borderRadius: 18,
            transform: "scaleX(-1)",
            background: "#000",
            display: camOn ? "block" : "none",
          }}
        />
        {status && <p style={{ marginTop: 10 }}>{status}</p>}
        {live && <p className="muted small">{live}</p>}

        <div style={{ marginTop: 12 }}>
          <label className="muted small">
            Sensitivity (higher = easier to trigger): {thresh}
          </label>
          <input
            type="range"
            min="10"
            max="50"
            value={thresh}
            onChange={(e) => setThresh(Number(e.target.value))}
            style={{ width: "100%", maxWidth: 360, display: "block" }}
          />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>Step 1: Teach "Nothing"</h3>
        <p className="muted small">
          Sit normally without any gesture. This stops false alarms.
          {hasNeutral ? " (Already trained. You can add more.)" : ""}
        </p>
        <button className="btn" disabled={busy} onClick={addNeutral}>
          😐 Record "Nothing"
        </button>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>Step 2: Teach a gesture</h3>
        <div className="form-col">
          <label>Gesture name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Happy"
          />
          <label>Message to say</label>
          <input
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. I am happy"
          />
          <label>Emoji</label>
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
          <button className="btn primary" disabled={busy} onClick={addGesture}>
            🔴 Record this gesture (3 sec countdown)
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h3>My trained gestures ({gestures.length})</h3>
          {gestures.length > 0 && (
            <button className="link-btn" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
        {gestures.length === 0 && (
          <p className="muted">Nothing trained yet.</p>
        )}
        {gestures.map((g) => (
          <div className="cue-row" key={g.id}>
            <span className="cue-emoji">{g.emoji}</span>
            <div className="cue-text">
              <strong>{g.name}</strong>
              <div className="muted small">
                {g.neutral ? "Resting pose" : '"' + g.message + '"'} •{" "}
                {g.samples.length} samples
              </div>
            </div>
            <button
              className="btn"
              disabled={busy}
              onClick={() => recordSamples(g.id, g.name)}
            >
              ➕ More samples
            </button>
            <button className="btn" onClick={() => remove(g)}>
              🗑
            </button>
          </div>
        ))}
      </div>
    </>
  );
}