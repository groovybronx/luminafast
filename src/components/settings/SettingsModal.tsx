import React, { useState, useRef, useEffect } from 'react';
import { LogIn, HardDrive, Image, Keyboard, User, Brain, Paintbrush, Info } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import * as settingsService from '@/services/settingsService';
import SettingsCategoryStorage from './SettingsCategoryStorage';
import SettingsCategoryCache from './SettingsCategoryCache';
import SettingsCategoryPreview from './SettingsCategoryPreview';
import SettingsCategoryKeyboardShortcuts from './SettingsCategoryKeyboardShortcuts';
import SettingsCategoryUserProfile from './SettingsCategoryUserProfile';
import SettingsCategoryAI from './SettingsCategoryAI';
import SettingsCategoryAppearance from './SettingsCategoryAppearance';
import SettingsCategoryAbout from './SettingsCategoryAbout';

const CATEGORY_COMPONENTS: Record<string, React.FC> = {
  storage: SettingsCategoryStorage,
  cache: SettingsCategoryCache,
  preview: SettingsCategoryPreview,
  keyboard: SettingsCategoryKeyboardShortcuts,
  user: SettingsCategoryUserProfile,
  ai: SettingsCategoryAI,
  appearance: SettingsCategoryAppearance,
  about: SettingsCategoryAbout,
};

const TABS = [
  { key: 'storage', label: 'Stockage', icon: HardDrive },
  { key: 'cache', label: 'Cache', icon: LogIn },
  { key: 'preview', label: 'Previews', icon: Image },
  { key: 'keyboard', label: 'Raccourcis', icon: Keyboard },
  { key: 'user', label: 'Profil', icon: User },
  { key: 'ai', label: 'AI', icon: Brain },
  { key: 'appearance', label: 'Apparence', icon: Paintbrush },
  { key: 'about', label: 'À propos', icon: Info },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('storage');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const { settings, saveToDBDebounced } = useSettingsStore();

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            if (last) last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            if (first) first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    // Focus le premier élément interactif
    if (first) setTimeout(() => first.focus(), 10);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      // Validate settings before saving
      const emailValid = settingsService.validateEmail(settings.user.email);
      if (!emailValid && settings.user.email) {
        throw new Error('Invalid email format');
      }

      // Check for shortcut conflicts
      const conflicts = settingsService.detectShortcutConflicts(settings.keyboard);
      if (conflicts.length > 0) {
        throw new Error(`Shortcut conflicts: ${conflicts[0]}`);
      }

      // Save to database
      await saveToDBDebounced(settings);

      setSaveStatus('success');
      // Auto-clear success message after 2s
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-200 animate-fade-in">
      <div
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative scale-100 transition-transform duration-200 animate-scale-in"
      >
        {/* Bouton de fermeture en haut à droite */}
        <button
          className="absolute top-3 right-3 text-neutral-500 hover:text-red-500 text-2xl font-bold z-10 focus:outline-none focus:ring-2 focus:ring-red-400 transition-transform duration-150 active:scale-90"
          onClick={onClose}
          aria-label="Fermer"
          tabIndex={0}
        >
          ✕
        </button>
        <div className="flex flex-1 min-h-125">
          {/* Sidebar verticale */}
          <aside className="w-52 bg-zinc-950/95 border-r border-zinc-900 py-6 flex flex-col gap-1 shadow-lg">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  className={`w-full flex items-center gap-3 text-left px-6 py-2 rounded-l font-semibold transition-all duration-150
                    ${
                      activeTab === tab.key
                        ? 'bg-zinc-900 text-blue-400 border-l-4 border-blue-500 shadow-md'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-blue-300'
                    }
                  `}
                  onClick={() => setActiveTab(tab.key)}
                  tabIndex={0}
                  aria-current={activeTab === tab.key ? 'page' : undefined}
                >
                  <Icon size={18} className="opacity-80" />
                  {tab.label}
                </button>
              );
            })}
          </aside>
          {/* Contenu principal */}
          <main className="flex-1 overflow-y-auto p-8">
            {(() => {
              const Comp = CATEGORY_COMPONENTS[activeTab];
              return Comp ? (
                <Comp />
              ) : (
                <div className="text-neutral-500 text-center py-12">
                  Sélectionnez un onglet pour configurer les paramètres.
                </div>
              );
            })()}
          </main>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 dark:border-neutral-700 p-4">
          <button
            className="px-4 py-2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
            onClick={onClose}
          >
            Annuler
          </button>
          <div className="relative">
            <button
              className={`px-4 py-2 rounded text-white transition-all duration-150 ${
                isSaving
                  ? 'bg-blue-500 opacity-70 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } ${saveStatus === 'success' ? 'bg-green-600' : ''} ${saveStatus === 'error' ? 'bg-red-600' : ''}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Enregistrement...
                </span>
              ) : saveStatus === 'success' ? (
                'Enregistré ✓'
              ) : saveStatus === 'error' ? (
                'Erreur ✗'
              ) : (
                'Enregistrer'
              )}
            </button>
            {saveStatus === 'error' && errorMessage && (
              <div className="absolute right-0 top-full mt-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-sm p-2 rounded w-max max-w-xs">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Ajout des animations Tailwind (à placer dans tailwind.config.js si besoin) :
// theme: { extend: { animation: { 'fade-in': 'fadeIn 0.2s', 'scale-in': 'scaleIn 0.2s' }, keyframes: { fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } }, scaleIn: { '0%': { transform: 'scale(0.95)' }, '100%': { transform: 'scale(1)' } } } } }
