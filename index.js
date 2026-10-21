const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const FILE = path.join(__dirname, "data.json");

const defaults = () => ({
  profile: null,
  history: [],
  plays: [],
  goals: [
    { id: "g1", title: "Learn new words", done: 2, target: 5 },
    { id: "g2", title: "Play memory game daily", done: 0, target: 1 },
    { id: "g3", title: "Express basic needs", done: 3, target: 5 },
    { id: "g4", title: "Follow daily routine", done: 4, target: 7 },
  ],
  cues: [
    { id: "c1", name: "Pointing at water", message: "I am thirsty", emoji: "💧", keyword: "THIRSTY", active: true },
    { id: "c2", name: "Hand to mouth", message: "I am hungry", emoji: "🍔", keyword: "HUNGRY", active: true },
    { id: "c3", name: "Waving hand", message: "Hello", emoji: "👋", keyword: "", active: true },
  ],
});

const load = () => {
  try {
    return { ...defaults(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch (e) {
    return defaults();
  }
};
const save = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

app.get("/api/all", (req, res) => {
  const d = load();
  res.json({
    profile: d.profile,
    history: d.history,
    plays: d.plays,
    goals: d.goals,
    cues: d.cues,
  });
});

app.put("/api/profile", (req, res) => {
  const d = load();
  d.profile = { ...(d.profile || {}), ...req.body };
  save(d);
  res.json(d.profile);
});

app.post("/api/history", (req, res) => {
  const d = load();
  const { text, icon, time, source } = req.body;
  d.history = [{ text, icon, time, source }, ...d.history].slice(0, 200);
  save(d);
  res.json({ ok: true });
});

app.delete("/api/history", (req, res) => {
  const d = load();
  d.history = [];
  save(d);
  res.json({ ok: true });
});

app.post("/api/plays", (req, res) => {
  const d = load();
  const { game, result, time } = req.body;
  d.plays = [{ game, result, time, date: new Date().toISOString() }, ...d.plays].slice(0, 200);
  save(d);
  res.json({ ok: true });
});

app.post("/api/goals", (req, res) => {
  const d = load();
  const goal = {
    id: "g" + Date.now(),
    title: req.body.title || "New goal",
    done: 0,
    target: Number(req.body.target) || 5,
  };
  d.goals.push(goal);
  save(d);
  res.json(goal);
});

app.put("/api/goals/:id", (req, res) => {
  const d = load();
  d.goals = d.goals.map((g) => (g.id === req.params.id ? { ...g, ...req.body } : g));
  save(d);
  res.json({ ok: true });
});

app.delete("/api/goals/:id", (req, res) => {
  const d = load();
  d.goals = d.goals.filter((g) => g.id !== req.params.id);
  save(d);
  res.json({ ok: true });
});

app.post("/api/cues", (req, res) => {
  const d = load();
  const cue = {
    id: "c" + Date.now(),
    name: req.body.name || "New cue",
    message: req.body.message || "",
    emoji: req.body.emoji || "💬",
    keyword: (req.body.keyword || "").trim(),
    active: true,
  };
  d.cues.push(cue);
  save(d);
  res.json(cue);
});

app.put("/api/cues/:id", (req, res) => {
  const d = load();
  d.cues = d.cues.map((c) => (c.id === req.params.id ? { ...c, ...req.body } : c));
  save(d);
  res.json({ ok: true });
});

app.delete("/api/cues/:id", (req, res) => {
  const d = load();
  d.cues = d.cues.filter((c) => c.id !== req.params.id);
  save(d);
  res.json({ ok: true });
});

app.listen(3001, () => console.log("API running on http://localhost:3001"));