import { useEffect, useRef, useState } from "react";
import {
  GestureRecognizer,
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

const STORE_KEY = "gestivo_custom_gestures";
const STRICT_KEY = "gestivo_custom_strictness";
const CUSTOM_PREFIX = "🖐️ ";
const SAMPLES_TO_RECORD = 30;
const DEFAULT_STRICT = 0.25;

// ---------------------------------------------------------
// SAVED GESTURES (stored in the browser, no backend needed)
// ---------------------------------------------------------

function loadGestures() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveGestures(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

function loadStrictness() {
  try {
    const v = parseFloat(localStorage.getItem(STRICT_KEY));
    return v >= 0.12 && v <= 0.45 ? v : DEFAULT_STRICT;
  } catch (e) {
    return DEFAULT_STRICT;
  }
}

// ---------------------------------------------------------
// HAND SHAPE -> 40 numbers (position-free, size-free)
// ---------------------------------------------------------

function handVector(hand, vw, vh) {
  const wx = hand[0].x * vw;
  const wy = hand[0].y * vh;
  const size =
    Math.hypot(hand[9].x * vw - wx, hand[9].y * vh - wy) || 1;

  const v = [];
  for (let i = 1; i < 21; i++) {
    v.push((hand[i].x * vw - wx) / size);
    v.push((hand[i].y * vh - wy) / size);
  }
  return v;
}

function roundVec(v) {
  return v.map((n) => Math.round(n * 1000) / 1000);
}

function vecDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / a.length);
}

function matchCustom(vec, gestures) {
  let best = null;
  let bestDist = Infinity;

  for (const g of gestures) {
    if (!g.samples || g.samples.length === 0) continue;

    const dists = g.samples
      .map((s) => vecDistance(vec, s))
      .sort((a, b) => a - b);

    const k = Math.min(3, dists.length);
    let avg = 0;
    for (let i = 0; i < k; i++) avg += dists[i];
    avg /= k;

    if (avg < bestDist) {
      bestDist = avg;
      best = g;
    }
  }

  return { gesture: best, distance: bestDist };
}

function GestureCollector({ onDetect }) {
  const videoRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const historyRef = useRef([]);
  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  const lastReportedRef = useRef("");
  const lastSpokenRef = useRef({ text: "", time: 0 });
  const recordingRef = useRef(null);
  const frameCountRef = useRef(0);
  const onDetectRef = useRef(onDetect);
  const gesturesRef = useRef([]);
  const strictRef = useRef(DEFAULT_STRICT);

  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState("Camera not started");
  const [meaning, setMeaning] = useState("No gesture");
  const [debug, setDebug] = useState("");

  const [gestures, setGestures] = useState(() => loadGestures());
  const [strictness, setStrictness] = useState(() => loadStrictness());
  const [teachName, setTeachName] = useState("");
  const [progress, setProgress] = useState(null);
  const [teachMsg, setTeachMsg] = useState("");

  // keep refs in sync so the camera loop always sees the latest values
  onDetectRef.current = onDetect;
  gesturesRef.current = gestures;
  strictRef.current = strictness;

  // ---------------------------------------------------------
  // DISTANCE IN REAL PIXELS (fixes the 640x480 stretching)
  // ---------------------------------------------------------

  const dist = (a, b, w, h) =>
    Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

  // ---------------------------------------------------------
  // CHECK ONE HAND FOR THIRSTY / HUNGRY
  // ---------------------------------------------------------

  const evaluateHand = (hand, mouth, faceWidth, vw, vh) => {
    const d = (a, b) => dist(a, b, vw, vh);

    const handSize = d(hand[0], hand[9]) || 1;

    const thumbTip = hand[4];
    const fingerTips = [hand[8], hand[12], hand[16], hand[20]];
    const allTips = [thumbTip, ...fingerTips];

    const curledAvg =
      fingerTips.reduce((sum, t) => sum + d(t, hand[0]), 0) /
      4 /
      handSize;

    const thumbIndexGap = d(thumbTip, hand[8]) / handSize;
    const thumbMouth = d(thumbTip, mouth) / faceWidth;
    const closestTipMouth =
      Math.min(...allTips.map((t) => d(t, mouth))) / faceWidth;

    const cx = allTips.reduce((s, t) => s + t.x, 0) / 5;
    const cy = allTips.reduce((s, t) => s + t.y, 0) / 5;
    const centroid = { x: cx, y: cy };
    const spread =
      allTips.reduce((s, t) => s + d(t, centroid), 0) /
      5 /
      handSize;

    const thirsty =
      thumbMouth < 0.5 &&
      curledAvg < 1.6 &&
      thumbIndexGap > 0.75;

    const hungry =
      !thirsty &&
      closestTipMouth < 0.6 &&
      spread < 0.85;

    const info =
      `thumbMouth=${thumbMouth.toFixed(2)} ` +
      `closestTipMouth=${closestTipMouth.toFixed(2)} ` +
      `curled=${curledAvg.toFixed(2)} ` +
      `thumbIndexGap=${thumbIndexGap.toFixed(2)} ` +
      `spread=${spread.toFixed(2)}`;

    return { thirsty, hungry, info };
  };

  // ---------------------------------------------------------
  // START CAMERA
  // ---------------------------------------------------------

  const startCamera = async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      setStatus("Opening camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraOn(true);
      setStatus("Loading AI models...");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const gestureRecognizer =
        await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });

      const faceLandmarker =
        await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

      gestureRecognizerRef.current = gestureRecognizer;
      faceLandmarkerRef.current = faceLandmarker;

      setStatus("AI ready");

      detectGestures();
    } catch (error) {
      console.error(error);
      startedRef.current = false;
      setStatus("Camera or AI error");
      alert("Camera or AI could not start.");
    }
  };

  // ---------------------------------------------------------
  // TEACH A NEW GESTURE
  // ---------------------------------------------------------

  const startTeach = () => {
    const name = teachName.trim();

    if (!name) {
      setTeachMsg("Type what this gesture means first.");
      return;
    }
    if (!cameraOn || !gestureRecognizerRef.current) {
      setTeachMsg("Start the camera first and wait for 'AI ready'.");
      return;
    }

    recordingRef.current = { name, samples: [] };
    setProgress(0);
    setTeachMsg("Hold your gesture steady and move it a tiny bit...");
  };

  const finishTeach = (rec) => {
    recordingRef.current = null;
    setProgress(null);

    const list = gesturesRef.current.slice();
    const i = list.findIndex(
      (g) => g.name.toLowerCase() === rec.name.toLowerCase()
    );

    if (i >= 0) {
      list[i] = {
        name: list[i].name,
        samples: list[i].samples.concat(rec.samples).slice(-150),
      };
    } else {
      list.push({ name: rec.name, samples: rec.samples });
    }

    saveGestures(list);
    gesturesRef.current = list;
    setGestures(list);
    setTeachName("");
    setTeachMsg('Saved "' + rec.name + '". Now show it to test!');
  };

  const deleteGesture = (name) => {
    const list = gesturesRef.current.filter((g) => g.name !== name);
    saveGestures(list);
    gesturesRef.current = list;
    setGestures(list);
  };

  const changeStrictness = (value) => {
    setStrictness(value);
    try {
      localStorage.setItem(STRICT_KEY, String(value));
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------
  // SPEAK + TELL THE APP
  // ---------------------------------------------------------

  const speakOnce = (text) => {
    const now = Date.now();
    const last = lastSpokenRef.current;
    if (last.text === text && now - last.time < 4000) return;
    lastSpokenRef.current = { text, time: now };

    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const announce = (best) => {
    if (best === "No hand detected" || best === "Hand detected") return;

    if (best.startsWith(CUSTOM_PREFIX)) {
      speakOnce(best.slice(CUSTOM_PREFIX.length));
    }

    if (onDetectRef.current) {
      try {
        onDetectRef.current(best);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // ---------------------------------------------------------
  // SMOOTHING: use the most common result of the last 5 frames
  // ---------------------------------------------------------

  const showResult = (result) => {
    const history = historyRef.current;
    history.push(result);
    if (history.length > 5) history.shift();

    const counts = {};
    history.forEach((r) => {
      counts[r] = (counts[r] || 0) + 1;
    });

    let best = result;
    let bestCount = 0;
    Object.keys(counts).forEach((r) => {
      if (counts[r] > bestCount) {
        best = r;
        bestCount = counts[r];
      }
    });

    setMeaning(best);

    if (best !== lastReportedRef.current) {
      lastReportedRef.current = best;
      announce(best);
    }
  };

  // ---------------------------------------------------------
  // DETECTION LOOP
  // ---------------------------------------------------------

  const detectGestures = () => {
    if (!aliveRef.current) return;

    const video = videoRef.current;

    if (
      !video ||
      !gestureRecognizerRef.current ||
      !faceLandmarkerRef.current ||
      video.readyState < 2
    ) {
      animationRef.current = requestAnimationFrame(detectGestures);
      return;
    }

    if (video.currentTime === lastVideoTimeRef.current) {
      animationRef.current = requestAnimationFrame(detectGestures);
      return;
    }
    lastVideoTimeRef.current = video.currentTime;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const currentTime = performance.now();

    let handResult;
    let faceResult;

    try {
      handResult = gestureRecognizerRef.current.recognizeForVideo(
        video,
        currentTime
      );
      faceResult = faceLandmarkerRef.current.detectForVideo(
        video,
        currentTime
      );
    } catch (e) {
      console.error(e);
      animationRef.current = requestAnimationFrame(detectGestures);
      return;
    }

    // -------------------------------------------------------
    // NO HAND
    // -------------------------------------------------------

    if (!handResult.landmarks || handResult.landmarks.length === 0) {
      showResult("No hand detected");
      setDebug("");
      animationRef.current = requestAnimationFrame(detectGestures);
      return;
    }

    // -------------------------------------------------------
    // RECORDING A NEW GESTURE
    // -------------------------------------------------------

    if (recordingRef.current) {
      frameCountRef.current += 1;

      if (frameCountRef.current % 3 === 0) {
        const rec = recordingRef.current;
        rec.samples.push(roundVec(handVector(handResult.landmarks[0], vw, vh)));
        setProgress(rec.samples.length);

        if (rec.samples.length >= SAMPLES_TO_RECORD) {
          finishTeach(rec);
        }
      }

      setMeaning("⏺ Recording...");
      animationRef.current = requestAnimationFrame(detectGestures);
      return;
    }

    // -------------------------------------------------------
    // YOUR OWN SAVED GESTURES (checked first)
    // -------------------------------------------------------

    let customGesture = null;
    let customDist = Infinity;

    for (const hand of handResult.landmarks) {
      const m = matchCustom(handVector(hand, vw, vh), gesturesRef.current);
      if (m.gesture && m.distance < customDist) {
        customGesture = m.gesture;
        customDist = m.distance;
      }
    }

    if (customGesture && customDist < strictRef.current) {
      setDebug(
        `saved match: ${customGesture.name} (distance ${customDist.toFixed(
          2
        )}, limit ${strictRef.current.toFixed(2)})`
      );
      showResult(CUSTOM_PREFIX + customGesture.name);
      animationRef.current = requestAnimationFrame(detectGestures);
      return;
    }

    // -------------------------------------------------------
    // TWO HANDS CLOSE TOGETHER = UNCOMFORTABLE
    // -------------------------------------------------------

    if (handResult.landmarks.length >= 2) {
      const hand1 = handResult.landmarks[0];
      const hand2 = handResult.landmarks[1];

      const wristDistance = dist(hand1[0], hand2[0], vw, vh) / vw;
      const palmDistance = dist(hand1[9], hand2[9], vw, vh) / vw;

      if (wristDistance < 0.25 || palmDistance < 0.22) {
        showResult("😣 UNCOMFORTABLE — I am feeling uncomfortable");
        animationRef.current = requestAnimationFrame(detectGestures);
        return;
      }
    }

    // -------------------------------------------------------
    // BASIC GESTURE NAME (first hand)
    // -------------------------------------------------------

    const gestureName =
      handResult.gestures?.[0]?.[0]?.categoryName || "";

    let result = "Hand detected";

    if (gestureName === "Open_Palm") result = "👋 HI";
    else if (gestureName === "Thumb_Up") result = "👍 Thumb Up";
    else if (gestureName === "Thumb_Down") result = "👎 Thumb Down";
    else if (gestureName === "Closed_Fist") result = "👊 Closed Fist";
    else if (gestureName === "Victory") result = "✌️ VICTORY";
    else if (gestureName === "Pointing_Up") result = "☝️ Pointing Up";
    else if (gestureName === "ILoveYou") result = "🤟 I LOVE YOU";

    // -------------------------------------------------------
    // FACE + HAND: THIRSTY / HUNGRY
    // -------------------------------------------------------

    let debugText = `model says: ${gestureName || "none"}`;

    if (customGesture) {
      debugText += ` | closest saved: ${
        customGesture.name
      } (${customDist.toFixed(2)}, needs below ${strictRef.current.toFixed(2)})`;
    }

    if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
      const face = faceResult.faceLandmarks[0];

      const upperLip = face[13];
      const lowerLip = face[14];

      const mouth = {
        x: (upperLip.x + lowerLip.x) / 2,
        y: (upperLip.y + lowerLip.y) / 2,
      };

      const faceWidth = dist(face[234], face[454], vw, vh) || vw * 0.3;

      for (const hand of handResult.landmarks) {
        const r = evaluateHand(hand, mouth, faceWidth, vw, vh);

        if (r.thirsty) {
          result = "💧 THIRSTY — I am thirsty";
          break;
        }
        if (r.hungry) {
          result = "🍽️ HUNGRY — I am hungry";
          break;
        }
      }
    } else {
      debugText += " | face not detected";
    }

    setDebug(debugText);
    showResult(result);

    animationRef.current = requestAnimationFrame(detectGestures);
  };

  // ---------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------

  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const stream = videoRef.current?.srcObject;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  const panel = {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    textAlign: "left",
  };

  const inputStyle = {
    flex: 1,
    minWidth: "180px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    fontSize: "15px",
  };

  const bigButton = {
    padding: "10px 22px",
    fontSize: "16px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    color: "#fff",
    background: "linear-gradient(90deg, #2d7bff, #6a5cff)",
  };

  return (
    <div
      style={{
        padding: "16px",
        textAlign: "center",
        color: "#f3f1ff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <h2 style={{ margin: "0 0 6px" }}>GESTIVO AI</h2>

      <p style={{ margin: "0 0 12px", fontWeight: "bold" }}>{status}</p>

      <button
        onClick={startCamera}
        disabled={cameraOn}
        style={{ ...bigButton, opacity: cameraOn ? 0.7 : 1 }}
      >
        {cameraOn ? "Camera Running" : "Start Camera"}
      </button>

      <br />
      <br />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="640"
        height="480"
        style={{
          borderRadius: "15px",
          border: "3px solid #6a5cff",
          maxWidth: "100%",
          background: "#000",
        }}
      />

      <div style={panel}>
        <h3 style={{ margin: "0 0 6px", textAlign: "center" }}>
          Detected Meaning
        </h3>

        <div
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {meaning}
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "#a8a4c9",
            wordBreak: "break-word",
            textAlign: "center",
          }}
        >
          {debug}
        </p>
      </div>

      <div style={panel}>
        <h3 style={{ margin: "0 0 4px" }}>Teach a new gesture</h3>

        <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#a8a4c9" }}>
          1. Start the camera. 2. Type what the gesture means. 3. Press Record
          and hold the gesture for about 3 seconds, moving it a tiny bit. Do
          it 2 or 3 times for best results. Gestures are saved on this device.
        </p>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={teachName}
            onChange={(e) => setTeachName(e.target.value)}
            placeholder="e.g. I need the toilet"
            style={inputStyle}
            disabled={progress !== null}
          />

          <button
            onClick={startTeach}
            disabled={progress !== null}
            style={{ ...bigButton, opacity: progress !== null ? 0.6 : 1 }}
          >
            {progress !== null
              ? "Recording " + progress + "/" + SAMPLES_TO_RECORD
              : "⏺ Record gesture"}
          </button>
        </div>

        {teachMsg && (
          <p style={{ margin: "10px 0 0", fontSize: "14px", color: "#ffd86b" }}>
            {teachMsg}
          </p>
        )}

        <h4 style={{ margin: "16px 0 6px" }}>
          Saved gestures ({gestures.length})
        </h4>

        {gestures.length === 0 && (
          <p style={{ margin: 0, fontSize: "13px", color: "#a8a4c9" }}>
            Nothing saved yet.
          </p>
        )}

        {gestures.map((g) => (
          <div
            key={g.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span>
              🖐️ {g.name}{" "}
              <span style={{ fontSize: "12px", color: "#a8a4c9" }}>
                ({g.samples.length} samples)
              </span>
            </span>

            <button
              onClick={() => deleteGesture(g.name)}
              style={{
                padding: "4px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "transparent",
                color: "#ff9fb4",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}

        <div style={{ marginTop: "16px" }}>
          <label style={{ fontSize: "13px", color: "#a8a4c9" }}>
            Strictness: {strictness.toFixed(2)} (lower = stricter, higher =
            easier to match)
          </label>
          <input
            type="range"
            min="0.12"
            max="0.45"
            step="0.01"
            value={strictness}
            onChange={(e) => changeStrictness(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

export default GestureCollector;