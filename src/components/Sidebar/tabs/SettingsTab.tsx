import React, { useState, useEffect } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useToast } from '../../../context/ToastContext';
import { dbOp } from '../../../utils/indexedDB';
import { Language } from '../../../utils/types';
import { Moon, Sun, User, Palette, Globe, HelpCircle, Trash, RefreshCw } from 'lucide-react';

export const SettingsTab: React.FC = () => {
    const { config, updateConfig, refreshData, t } = useGraph();
    const { showToast } = useToast();
    
    // Local state for settings form
    const [userName, setUserName] = useState<string>(config.userProfile.name || 'User');
    const [userColor, setUserColor] = useState<string>(config.userProfile.color);
    
    const isDark = config.theme === 'dark';

    const languages: { val: Language, label: string }[] = [
        { val: 'en', label: 'English' },
        { val: 'ua', label: 'Українська' },
        { val: 'cz', label: 'Čeština' },
        { val: 'fr', label: 'Français' },
        { val: 'bg', label: 'Български' },
        { val: 'de', label: 'Deutsch' },
        { val: 'es', label: 'Español' },
    ];

    // Debounce updates for User Profile to avoid constant context updates
    useEffect(() => {
        const timer = setTimeout(() => {
            if (userName !== config.userProfile.name || userColor !== config.userProfile.color) {
                updateConfig({
                    ...config,
                    userProfile: {
                        ...config.userProfile,
                        name: userName,
                        color: userColor
                    }
                });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [userName, userColor]);


    const handleClearData = async () => {
        if(window.confirm("Are you sure? This will delete all local data.")) {
            try {
                await dbOp('nodes', 'readwrite', 'clear');
                await dbOp('edges', 'readwrite', 'clear');
                await dbOp('comments', 'readwrite', 'clear');
                refreshData(); 
                showToast("All local data cleared", 'success');
            } catch (e) {
                console.error(e);
                showToast("Failed to clear data", 'error');
            }
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('settings.app')}</h3>
            
            {/* Theme & Language */}
            <div className="flex gap-2">
                 <button 
                    onClick={() => updateConfig({...config, theme: isDark ? 'light' : 'dark'})} 
                    className="flex-1 flex items-center justify-center gap-2 p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors bg-white dark:bg-slate-900"
                 >
                     {isDark ? <Sun size={14} /> : <Moon size={14} />}
                     {isDark ? t('btn.mode.light') : t('btn.mode.dark')}
                 </button>

                 <div className="relative flex-1">
                     <select 
                        value={config.language}
                        onChange={(e) => updateConfig({...config, language: e.target.value as Language})}
                        className="w-full appearance-none p-2 pl-8 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 outline-none cursor-pointer"
                     >
                        {languages.map(l => (
                            <option key={l.val} value={l.val} className="text-gray-900 dark:text-gray-100 dark:bg-slate-800">{l.label}</option>
                        ))}
                     </select>
                     <Globe size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
                 </div>
            </div>

            {/* User Profile */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-3 space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2">
                    <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('settings.user.profile')}</span>
                </div>
                <div className="space-y-2">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{t('settings.display.name')}</div>
                    <input 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded p-1.5 text-xs focus:border-indigo-400 outline-none text-gray-800 dark:text-gray-100"
                    />
                </div>
                <div className="space-y-2">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{t('settings.cursor.color')}</div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="color" 
                            value={userColor} 
                            onChange={(e) => setUserColor(e.target.value)}
                            className="w-full h-8 cursor-pointer border-0 rounded bg-transparent"
                        />
                    </div>
                </div>
            </div>

             {/* Default Colors */}
             <div className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-3 space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2">
                    <Palette size={14} className="text-pink-600 dark:text-pink-400" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('settings.default.colors')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('settings.comp.bg')}</div>
                        <input 
                            type="color" 
                            className="w-full h-6 border rounded cursor-pointer dark:border-slate-600" 
                            value={config.defaultColors.componentBg || '#6366F1'}
                            onChange={(e) => updateConfig({
                                ...config,
                                defaultColors: {
                                    ...config.defaultColors,
                                    componentBg: e.target.value
                                }
                            })}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('settings.prop.text')}</div>
                        <input 
                            type="color" 
                            className="w-full h-6 border rounded cursor-pointer dark:border-slate-600" 
                            value={config.defaultColors.propertyText || '#000000'}
                            onChange={(e) => updateConfig({
                                ...config,
                                defaultColors: {
                                    ...config.defaultColors,
                                    propertyText: e.target.value
                                }
                            })}
                        />
                    </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-gray-50 dark:border-slate-700">
                     <div className="text-[10px] text-gray-500">{t('settings.canvas.bg')}</div>
                     <input 
                        type="color" 
                        className="w-full h-6 border rounded cursor-pointer" 
                        value={config.defaultColors.canvasBg || '#f8fafc'}
                        onChange={(e) => updateConfig({
                            ...config,
                            defaultColors: {
                                ...config.defaultColors,
                                canvasBg: e.target.value
                            }
                        })}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
                <button className="w-full flex items-center justify-center gap-2 p-2 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors">
                    <HelpCircle size={14} /> Help & Instructions
                </button>
                <button onClick={handleClearData} className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors">
                    <Trash size={14} /> Clear All App Data
                </button>
            </div>

            <div className="text-center text-[10px] text-gray-300 pt-4">
                v1.0.0 • Local Storage Mode
            </div>
        </div>
    );
};
