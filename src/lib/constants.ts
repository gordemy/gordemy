export const NMT_SUBJECTS = [
  { id: "ukr", label: "Українська мова", icon: "📝" },
  { id: "math", label: "Математика", icon: "📐" },
  { id: "hist", label: "Історія України", icon: "📜" },
  { id: "eng", label: "Англійська мова", icon: "🌍" },
  { id: "bio", label: "Біологія", icon: "🧬" },
  { id: "phys", label: "Фізика", icon: "⚡" },
  { id: "chem", label: "Хімія", icon: "🧪" },
  { id: "geo", label: "Географія", icon: "🗺️" },
] as const;

export const SCORE_OPTIONS = [
  { value: 150, label: "150+", desc: "Достатньо для вступу", color: "green" },
  { value: 175, label: "175+", desc: "Конкурентний бал", color: "blue" },
  { value: 190, label: "190+", desc: "Топ-університети", color: "purple" },
  { value: 200, label: "200", desc: "Максимум!", color: "orange" },
] as const;

export const TIME_OPTIONS = [
  { value: 15, label: "15 хв", desc: "Щодня по трохи", icon: "🌱" },
  { value: 30, label: "30 хв", desc: "Золота середина", icon: "⚡" },
  { value: 60, label: "1 година", desc: "Серйозна підготовка", icon: "🔥" },
  { value: 90, label: "1.5+ год", desc: "Повна віддача", icon: "🚀" },
] as const;

export type SubjectId = (typeof NMT_SUBJECTS)[number]["id"];