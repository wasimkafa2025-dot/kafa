import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sun, 
  Moon, 
  RotateCcw, 
  Check, 
  Palette, 
  Sparkles, 
  Eye, 
  Sliders, 
  Type, 
  Layout, 
  Square, 
  Maximize2 
} from 'lucide-react';
import { 
  ColorThemeConfig, 
  ThemePreset, 
  DAY_PRESETS, 
  NIGHT_PRESETS, 
  DEFAULT_DAY_THEME, 
  DEFAULT_NIGHT_THEME, 
  getDayTheme, 
  getNightTheme, 
  saveDayTheme, 
  saveNightTheme, 
  resetDayTheme, 
  resetNightTheme, 
  applyColorThemes 
} from '../lib/themeManager';

interface ThemeColorModalProps {
  onClose: () => void;
  currentAppTheme: 'light' | 'dark';
  setAppTheme: (theme: 'light' | 'dark') => void;
}

export const ThemeColorModal: React.FC<ThemeColorModalProps> = ({
  onClose,
  currentAppTheme,
  setAppTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'day' | 'night'>(
    currentAppTheme === 'dark' ? 'night' : 'day'
  );

  const [dayConfig, setDayConfig] = useState<ColorThemeConfig>(getDayTheme);
  const [nightConfig, setNightConfig] = useState<ColorThemeConfig>(getNightTheme);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Synchronize active tab with app preview if user switches tab
  const handleTabChange = (tab: 'day' | 'night') => {
    setActiveTab(tab);
    setAppTheme(tab === 'day' ? 'light' : 'dark');
  };

  // Live preview as user tweaks inputs
  useEffect(() => {
    applyColorThemes(dayConfig, nightConfig);
  }, [dayConfig, nightConfig]);

  const currentConfig = activeTab === 'day' ? dayConfig : nightConfig;
  const currentPresets = activeTab === 'day' ? DAY_PRESETS : NIGHT_PRESETS;

  const updateCurrentField = (field: keyof ColorThemeConfig, value: string) => {
    if (activeTab === 'day') {
      const updated = { ...dayConfig, [field]: value };
      setDayConfig(updated);
    } else {
      const updated = { ...nightConfig, [field]: value };
      setNightConfig(updated);
    }
  };

  const handleApplyPreset = (preset: ThemePreset) => {
    if (activeTab === 'day') {
      setDayConfig(preset.config);
    } else {
      setNightConfig(preset.config);
    }
    setSavedFeedback(`បានជ្រើសរើស: "${preset.nameKh}"`);
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  const handleResetCurrent = () => {
    if (activeTab === 'day') {
      const def = resetDayTheme();
      setDayConfig(def);
      setSavedFeedback('បានកំណត់ឡើងវិញនូវពណ៌ពេលថ្ងៃ (Reset to Day Default)');
    } else {
      const def = resetNightTheme();
      setNightConfig(def);
      setSavedFeedback('បានកំណត់ឡើងវិញនូវពណ៌ពេលយប់ (Reset to Night Default)');
    }
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  const handleSaveAll = () => {
    saveDayTheme(dayConfig);
    saveNightTheme(nightConfig);
    setSavedFeedback('បានរក្សាទុកពណ៌ជោគជ័យ! (Saved All Theme Colors)');
    setTimeout(() => {
      setSavedFeedback(null);
      onClose();
    }, 600);
  };

  // Color targets definitions with icons and descriptions
  const colorFields: {
    key: keyof ColorThemeConfig;
    labelKh: string;
    labelEn: string;
    descKh: string;
    icon: any;
    quickSwatches: string[];
  }[] = activeTab === 'day' 
    ? [
        {
          key: 'text',
          labelKh: 'ពណ៌អក្សរ (Text)',
          labelEn: 'Text Typography',
          descKh: 'ពណ៌អក្សរចំណងជើង និងខ្លឹមសារទូទាំង Dashboard',
          icon: Type,
          quickSwatches: ['#051429', '#0F172A', '#1E293B', '#3E2723', '#064E3B', '#4C0519'],
        },
        {
          key: 'bg',
          labelKh: 'ផ្ទៃ Dashboard (Background)',
          labelEn: 'Main Dashboard Canvas',
          descKh: 'ពណ៌ផ្ទៃខាងក្រោយធំនៃទំព័រការងារទាំងមូល',
          icon: Layout,
          quickSwatches: ['#FAF5DC', '#F8FAFC', '#F0FDF4', '#FDF8F0', '#FFF1F2', '#F0F9FF'],
        },
        {
          key: 'card',
          labelKh: 'ស៊ុម Frame & Sidebar (Card & Frame)',
          labelEn: 'Containers & Sidebar',
          descKh: 'ពណ៌ផ្ទៃនៃផ្ទាំងចំហៀង Header និងផ្ទាំងការងារ (Cards)',
          icon: Square,
          quickSwatches: ['#FFFDF4', '#FFFFFF', '#F8FAFC', '#FFFDF9', '#F1F5F9', '#FEFCE8'],
        },
        {
          key: 'border',
          labelKh: 'បន្ទាត់ស៊ុម (Frame Borders)',
          labelEn: 'Borders & Outlines',
          descKh: 'បន្ទាត់ព័ទ្ធជុំវិញស៊ុម Sidebar, Cards និងតារាង',
          icon: Maximize2,
          quickSwatches: ['#E8DCAC', '#E2E8F0', '#BBF7D0', '#EADBC8', '#FECDD3', '#BAE6FD'],
        },
        {
          key: 'accent',
          labelKh: 'ពណ៌ប៊ូតុង & Accent (Buttons)',
          labelEn: 'Action Buttons & Highlights',
          descKh: 'ពណ៌ប៊ូតុងសំខាន់ៗ Icon និងផ្ទាំងជ្រើសរើសសកម្ម',
          icon: Sparkles,
          quickSwatches: ['#C59B27', '#2563EB', '#059669', '#A0522D', '#E11D48', '#0284C7'],
        },
      ]
    : [
        {
          key: 'text',
          labelKh: 'ពណ៌អក្សរ (Text)',
          labelEn: 'Night Text Typography',
          descKh: 'ពណ៌អក្សរចំណងជើង និងខ្លឹមសារក្នុងទម្រង់រាត្រី',
          icon: Type,
          quickSwatches: ['#F8E9A1', '#E2E8F0', '#A7F3D0', '#E9D5FF', '#FDE68A', '#FECDD3'],
        },
        {
          key: 'bg',
          labelKh: 'ផ្ទៃ Dashboard (Night Background)',
          labelEn: 'Deep Night Canvas',
          descKh: 'ពណ៌ផ្ទៃខាងក្រោយធំពេលយប់',
          icon: Layout,
          quickSwatches: ['#030C1E', '#09090B', '#021812', '#0E071A', '#140D09', '#18070C'],
        },
        {
          key: 'card',
          labelKh: 'ស៊ុម Frame & Sidebar (Night Frame)',
          labelEn: 'Night Containers & Panels',
          descKh: 'ពណ៌ផ្ទាំងចំហៀង Header និងផ្ទាំង Cards ពេលយប់',
          icon: Square,
          quickSwatches: ['#0B1F3A', '#18181B', '#062C21', '#1A102E', '#241710', '#2D0E17'],
        },
        {
          key: 'border',
          labelKh: 'បន្ទាត់ស៊ុម (Night Borders)',
          labelEn: 'Borders & Outlines',
          descKh: 'បន្ទាត់ព័ទ្ធជុំវិញស៊ុមពេលយប់',
          icon: Maximize2,
          quickSwatches: ['#1E3A5F', '#27272A', '#0F5132', '#3B2361', '#452A1D', '#4C1D26'],
        },
        {
          key: 'accent',
          labelKh: 'ពណ៌ប៊ូតុង & Accent (Night Buttons)',
          labelEn: 'Action Buttons & Highlights',
          descKh: 'ពណ៌ប៊ូតុង និងពន្លឺលម្អពេលយប់',
          icon: Sparkles,
          quickSwatches: ['#F8E9A1', '#38BDF8', '#10B981', '#A855F7', '#F59E0B', '#F43F5E'],
        },
      ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-3 md:p-6 animate-fade-in">
      <div className="bg-white dark:bg-[#0B1F3A] border border-gray-200 dark:border-gold-500/20 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative transition-colors duration-300">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gold-500/15 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-gray-900 dark:text-gold-500 flex items-center gap-2">
                <span>កែសម្រួលពណ៌ប្រព័ន្ធ (Custom Theme Colors)</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-sans mt-0.5">
                ជ្រើសរើសពណ៌សម្រាប់អក្សរ, ផ្ទៃ Dashboard, ស៊ុម Frame និងប៊ូតុង (បែងចែក ថ្ងៃ និង យប់)
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gold-400 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="បិទ (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (ថ្ងៃ / យប់) */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-100 dark:border-gold-500/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-950/60 rounded-2xl border border-gray-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => handleTabChange('day')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'day'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>☀️ ជម្រើសពេលថ្ងៃ (Day Mode)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('night')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'night'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <span>🌙 ជម្រើសពេលយប់ (Night Mode)</span>
            </button>
          </div>

          {/* Live Preview Indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px]">មើលឃើញការផ្លាស់ប្តូរភ្លាមៗ (Live Preview Active)</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

          {/* Live Miniature Card Preview */}
          <div 
            className="p-4 rounded-2xl border transition-all shadow-sm"
            style={{ 
              backgroundColor: currentConfig.card, 
              borderColor: currentConfig.border 
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span 
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: currentConfig.accent }}
              >
                ★ ទម្រង់គំរូនៃផ្ទាំងការងារ (Live Frame Preview)
              </span>
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ 
                  backgroundColor: `${currentConfig.accent}20`,
                  color: currentConfig.accent 
                }}
              >
                {activeTab === 'day' ? 'Day Light' : 'Night Dark'}
              </span>
            </div>
            
            <p 
              className="font-bold text-sm mb-1"
              style={{ color: currentConfig.text }}
            >
              កិច្ចការគំរូ៖ រៀបចំរបាយការណ៍ និងតាមដានផែនការការងារ
            </p>
            <p 
              className="text-xs opacity-80 mb-3"
              style={{ color: currentConfig.text }}
            >
              នេះជាការបង្ហាញពីរបៀបដែលពណ៌អក្សរ ស៊ុមបន្ទាត់ និងប៊ូតុងនឹងលេចចេញនៅលើអេក្រង់ជាក់ស្តែង។
            </p>

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                className="px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-xs cursor-default"
                style={{ backgroundColor: currentConfig.accent }}
              >
                ប៊ូតុងសកម្មភាព (Button)
              </button>
              <div 
                className="h-4 w-px"
                style={{ backgroundColor: currentConfig.border }}
              ></div>
              <span 
                className="text-[11px] font-mono"
                style={{ color: currentConfig.text }}
              >
                Dashboard Bg: {currentConfig.bg}
              </span>
            </div>
          </div>

          {/* Section: Curated Presets */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 select-none">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>កញ្ចប់ពណ៌ស្អាតៗដែលបានរៀបចំទុក (Curated Presets)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {currentPresets.map(preset => {
                const isSelected = 
                  currentConfig.bg === preset.config.bg &&
                  currentConfig.text === preset.config.text &&
                  currentConfig.card === preset.config.card &&
                  currentConfig.accent === preset.config.accent;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-md bg-amber-500/5'
                        : 'border-gray-200 dark:border-white/10 hover:border-amber-500/50 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: preset.config.bg }} title="Bg" />
                      <div className="w-4 h-4 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: preset.config.card }} title="Card/Frame" />
                      <div className="w-4 h-4 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: preset.config.text }} title="Text" />
                      <div className="w-4 h-4 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: preset.config.accent }} title="Accent" />
                    </div>

                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {preset.nameKh}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                      {preset.nameEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Custom Color Pickers */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 select-none">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>កំណត់ពណ៌តាមចិត្តលម្អិត (Custom Individual Color Pickers)</span>
            </h4>

            <div className="space-y-3">
              {colorFields.map(field => {
                const value = currentConfig[field.key];
                const IconComponent = field.icon;

                return (
                  <div 
                    key={field.key} 
                    className="p-3 bg-gray-50/80 dark:bg-slate-900/60 border border-gray-200/80 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                            {field.labelKh}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ({field.labelEn})
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                          {field.descKh}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Quick Swatches */}
                      <div className="flex items-center gap-1 mr-1">
                        {field.quickSwatches.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateCurrentField(field.key, color)}
                            className={`w-5 h-5 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                              value.toLowerCase() === color.toLowerCase()
                                ? 'border-amber-500 ring-2 ring-amber-500/40 scale-110'
                                : 'border-black/15 dark:border-white/15'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>

                      {/* Native HTML5 Color Picker */}
                      <div className="relative flex items-center">
                        <input
                          type="color"
                          id={`color-picker-${field.key}`}
                          value={value.startsWith('#') && value.length === 7 ? value : '#C59B27'}
                          onChange={(e) => updateCurrentField(field.key, e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 dark:border-white/10 p-0 bg-transparent overflow-hidden"
                          title="Click to open color palette wheel"
                        />
                      </div>

                      {/* Hex input */}
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateCurrentField(field.key, e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-gray-200 text-center uppercase focus:ring-1 focus:ring-amber-500"
                        maxLength={9}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback notification */}
          {savedFeedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{savedFeedback}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gold-500/15 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-gray-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={handleResetCurrent}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>កំណត់ឡើងវិញ (Reset {activeTab === 'day' ? 'Day' : 'Night'})</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              បោះបង់ (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>រក្សាទុកពណ៌ (Save & Apply Colors)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
