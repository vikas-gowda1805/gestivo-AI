export const speak = (text) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
};

export const NAV = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "child", icon: "🧒", label: "Child Mode" },
  { id: "caregiver", icon: "💜", label: "Caregiver Mode" },
  { id: "board", icon: "💬", label: "Communication Board" },
  { id: "camera", icon: "📷", label: "Camera" },
  { id: "history", icon: "🕒", label: "History" },
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export const CARDS = [
  { key: "want", emoji: "✋", title: "I want", sub: "Express needs & wants", color: "c-orange", say: "I want something" },
  { key: "hungry", emoji: "🍔", title: "I'm hungry", sub: "Food & Drink", color: "c-pink", say: "I am hungry" },
  { key: "thirsty", emoji: "🥤", title: "I'm thirsty", sub: "Water & Drinks", color: "c-blue", say: "I am thirsty" },
  { key: "play", emoji: "⚽", title: "I want to play", sub: "Games & Fun", color: "c-green", say: "I want to play" },
  { key: "feel", emoji: "💜", title: "I feel", sub: "Emotions", color: "c-purple", say: "I feel happy" },
  { key: "yesno", emoji: "😊", title: "Yes / No", sub: "Responses", color: "c-teal", say: "Yes" },
  { key: "camera", emoji: "📷", title: "Camera", sub: "Gesture detection", color: "c-camera", action: "camera" },
];

export const BOARD = {
  Basics: [
    { icon: "✋", text: "I want", color: "c-orange" },
    { icon: "🍔", text: "I am hungry", color: "c-pink" },
    { icon: "🥤", text: "I am thirsty", color: "c-blue" },
    { icon: "⚽", text: "I want to play", color: "c-green" },
    { icon: "✅", text: "Yes", color: "c-teal" },
    { icon: "❌", text: "No", color: "c-pink" },
    { icon: "🆘", text: "Help", color: "c-purple" },
    { icon: "🙏", text: "Thank you", color: "c-orange" },
  ],
  Feelings: [
    { icon: "😊", text: "I am happy", color: "c-orange" },
    { icon: "😢", text: "I am sad", color: "c-blue" },
    { icon: "😴", text: "I am tired", color: "c-purple" },
    { icon: "😣", text: "I am uncomfortable", color: "c-pink" },
    { icon: "❤️", text: "I love you", color: "c-pink" },
    { icon: "😡", text: "I am angry", color: "c-orange" },
  ],
  Needs: [
    { icon: "🚽", text: "I need the toilet", color: "c-blue" },
    { icon: "💊", text: "I need medicine", color: "c-green" },
    { icon: "🛏️", text: "I want to sleep", color: "c-purple" },
    { icon: "🤗", text: "I need a hug", color: "c-pink" },
    { icon: "🥤", text: "I am thirsty", color: "c-blue" },
    { icon: "🍔", text: "I am hungry", color: "c-orange" },
  ],
  More: [
    { icon: "🏠", text: "I want to go home", color: "c-teal" },
    { icon: "📺", text: "I want to watch TV", color: "c-purple" },
    { icon: "🎵", text: "I want music", color: "c-green" },
    { icon: "📖", text: "I want a story", color: "c-orange" },
  ],
};

export const GAMES = [
  { icon: "🧠", title: "Memory Game", sub: "Boost memory", color: "c-purple" },
  { icon: "🔷", title: "Shape Match", sub: "Learn shapes!", color: "c-orange" },
  { icon: "🦊", title: "Animal Sounds", sub: "Explore sounds", color: "c-pink" },
  { icon: "📖", title: "Story Time", sub: "Listen & Imagine", color: "c-teal" },
];