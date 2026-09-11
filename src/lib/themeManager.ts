export interface ColorThemeConfig {
  text: string;      // ពណ៌អក្សរ
  bg: string;        // ផ្ទៃ Dashboard (Dashboard Background)
  card: string;      // ស៊ុម Frame / Sidebar / Card (Frames & Containers)
  border: string;    // បន្ទាត់ស៊ុម (Frame Borders)
  accent: string;    // ពណ៌ប៊ូតុង & Accent (Buttons & Highlights)
}

export interface ThemePreset {
  id: string;
  nameKh: string;
  nameEn: string;
  config: ColorThemeConfig;
}

export const DEFAULT_DAY_THEME: ColorThemeConfig = {
  text: '#051429',
  bg: '#FAF5DC',
  card: '#FFFDF4',
  border: '#E8DCAC',
  accent: '#C59B27',
};

export const DEFAULT_NIGHT_THEME: ColorThemeConfig = {
  text: '#F8E9A1',
  bg: '#030C1E',
  card: '#0B1F3A',
  border: '#1E3A5F',
  accent: '#F8E9A1',
};

export const DAY_PRESETS: ThemePreset[] = [
  {
    id: 'day-gold-navy',
    nameKh: 'មាសរាជវាំង & ទឹកប៊ិច (លំនាំដើម)',
    nameEn: 'Classic Royal Gold & Navy',
    config: {
      text: '#051429',
      bg: '#FAF5DC',
      card: '#FFFDF4',
      border: '#E8DCAC',
      accent: '#C59B27',
    },
  },
  {
    id: 'day-clean-ivory',
    nameKh: 'សស្អាត & ខ្មៅប្រណិត',
    nameEn: 'Minimal Ivory & Slate',
    config: {
      text: '#0F172A',
      bg: '#F8FAFC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      accent: '#2563EB',
    },
  },
  {
    id: 'day-emerald',
    nameKh: 'បៃតងធម្មជាតិ & ត្បូងកណ្តៀង',
    nameEn: 'Fresh Emerald Forest',
    config: {
      text: '#064E3B',
      bg: '#F0FDF4',
      card: '#FFFFFF',
      border: '#BBF7D0',
      accent: '#059669',
    },
  },
  {
    id: 'day-caramel',
    nameKh: 'កាហ្វេស្រទន់ & ការ៉ាមែល',
    nameEn: 'Warm Caramel & Mocha',
    config: {
      text: '#3E2723',
      bg: '#FDF8F0',
      card: '#FFFDF9',
      border: '#EADBC8',
      accent: '#A0522D',
    },
  },
  {
    id: 'day-sakura',
    nameKh: 'ផ្កាឈូក & ផ្កាសាគូរ៉ា',
    nameEn: 'Sakura Blossom',
    config: {
      text: '#4C0519',
      bg: '#FFF1F2',
      card: '#FFFFFF',
      border: '#FECDD3',
      accent: '#E11D48',
    },
  },
  {
    id: 'day-ocean',
    nameKh: 'ផ្ទៃមេឃ & សមុទ្រខៀវស្រស់',
    nameEn: 'Azure Ocean Breeze',
    config: {
      text: '#082F49',
      bg: '#F0F9FF',
      card: '#FFFFFF',
      border: '#BAE6FD',
      accent: '#0284C7',
    },
  },
];

export const NIGHT_PRESETS: ThemePreset[] = [
  {
    id: 'night-midnight-gold',
    nameKh: 'រាត្រីទឹកប៊ិច & មាស (លំនាំដើម)',
    nameEn: 'Midnight Navy & Gold',
    config: {
      text: '#F8E9A1',
      bg: '#030C1E',
      card: '#0B1F3A',
      border: '#1E3A5F',
      accent: '#F8E9A1',
    },
  },
  {
    id: 'night-pitch-black',
    nameKh: 'រាត្រីងងឹតស្លេក & ប្រាក់',
    nameEn: 'Obsidian Black & Silver',
    config: {
      text: '#E2E8F0',
      bg: '#09090B',
      card: '#18181B',
      border: '#27272A',
      accent: '#38BDF8',
    },
  },
  {
    id: 'night-cyber-emerald',
    nameKh: 'ព្រៃរាត្រី & បៃតងពន្លឺ',
    nameEn: 'Cyber Neon Emerald',
    config: {
      text: '#A7F3D0',
      bg: '#021812',
      card: '#062C21',
      border: '#0F5132',
      accent: '#10B981',
    },
  },
  {
    id: 'night-amethyst',
    nameKh: 'ស្វាយអាថ៌កំបាំង & អ័រគីដេ',
    nameEn: 'Deep Mystic Amethyst',
    config: {
      text: '#E9D5FF',
      bg: '#0E071A',
      card: '#1A102E',
      border: '#3B2361',
      accent: '#A855F7',
    },
  },
  {
    id: 'night-dark-roast',
    nameKh: 'កាហ្វេរាត្រី & មាសក្រហម',
    nameEn: 'Dark Roast & Amber',
    config: {
      text: '#FDE68A',
      bg: '#140D09',
      card: '#241710',
      border: '#452A1D',
      accent: '#F59E0B',
    },
  },
  {
    id: 'night-crimson',
    nameKh: 'គ្រីមសុន & ព្រះចន្ទឈាម',
    nameEn: 'Crimson Eclipse',
    config: {
      text: '#FECDD3',
      bg: '#18070C',
      card: '#2D0E17',
      border: '#4C1D26',
      accent: '#F43F5E',
    },
  },
];

const DAY_KEY = 'taskflow_custom_theme_day';
const NIGHT_KEY = 'taskflow_custom_theme_night';

export function getDayTheme(): ColorThemeConfig {
  try {
    const raw = localStorage.getItem(DAY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_DAY_THEME, ...parsed };
    }
  } catch (err) {
    console.warn('Could not read day theme from localStorage:', err);
  }
  return { ...DEFAULT_DAY_THEME };
}

export function getNightTheme(): ColorThemeConfig {
  try {
    const raw = localStorage.getItem(NIGHT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_NIGHT_THEME, ...parsed };
    }
  } catch (err) {
    console.warn('Could not read night theme from localStorage:', err);
  }
  return { ...DEFAULT_NIGHT_THEME };
}

export function saveDayTheme(theme: ColorThemeConfig): void {
  try {
    localStorage.setItem(DAY_KEY, JSON.stringify(theme));
  } catch (err) {
    console.warn('Could not save day theme:', err);
  }
  applyColorThemes(theme, getNightTheme());
}

export function saveNightTheme(theme: ColorThemeConfig): void {
  try {
    localStorage.setItem(NIGHT_KEY, JSON.stringify(theme));
  } catch (err) {
    console.warn('Could not save night theme:', err);
  }
  applyColorThemes(getDayTheme(), theme);
}

export function resetDayTheme(): ColorThemeConfig {
  localStorage.removeItem(DAY_KEY);
  applyColorThemes(DEFAULT_DAY_THEME, getNightTheme());
  return { ...DEFAULT_DAY_THEME };
}

export function resetNightTheme(): ColorThemeConfig {
  localStorage.removeItem(NIGHT_KEY);
  applyColorThemes(getDayTheme(), DEFAULT_NIGHT_THEME);
  return { ...DEFAULT_NIGHT_THEME };
}

export function applyColorThemes(dayConfig?: ColorThemeConfig, nightConfig?: ColorThemeConfig): void {
  const day = dayConfig || getDayTheme();
  const night = nightConfig || getNightTheme();

  const css = `
:root {
  --text: ${day.text} !important;
  --title-text: ${day.text} !important;
  --bg: ${day.bg} !important;
  --card: ${day.card} !important;
  --border: ${day.border} !important;
  --gold: ${day.accent} !important;
  --dark-gold: ${day.accent} !important;
}

.dark {
  --text: ${night.text} !important;
  --title-text: ${night.text} !important;
  --bg: ${night.bg} !important;
  --card: ${night.card} !important;
  --border: ${night.border} !important;
  --gold: ${night.accent} !important;
  --dark-gold: ${night.accent} !important;
}

/* Day Mode explicit bindings */
html:not(.dark) {
  --text: ${day.text} !important;
  --bg: ${day.bg} !important;
  --card: ${day.card} !important;
  --border: ${day.border} !important;
  --gold: ${day.accent} !important;
}

/* Button & accent background overrides */
.bg-gold-500,
.bg-\\[\\#C59B27\\],
button.bg-gold-500,
button.bg-\\[\\#C59B27\\] {
  background-color: var(--gold) !important;
}

.text-gold-500,
.text-\\[\\#C59B27\\] {
  color: var(--gold) !important;
}

.border-gold-500,
.border-\\[\\#C59B27\\] {
  border-color: var(--gold) !important;
}

.sidebar-item.active {
  border-right-color: var(--gold) !important;
  color: var(--gold) !important;
}
.sidebar-item.active * {
  color: var(--gold) !important;
}
`;

  let styleEl = document.getElementById('taskflow-custom-theme-vars') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'taskflow-custom-theme-vars';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
