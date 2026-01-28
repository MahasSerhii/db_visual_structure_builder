import React, { useState, useEffect } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useToast } from '../../../context/ToastContext';
import { dbOp } from '../../../utils/indexedDB';

import { Language } from '../../../utils/types';
import { Moon, Sun, User, Palette, Globe, HelpCircle, Trash, RefreshCw, Key, Shield, ChevronDown, ChevronUp, LogOut } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + '/auth';

export const SettingsTab: React.FC = () => {
    const { config, updateConfig, refreshData, t, logout, isAuthenticated, authProvider } = useGraph();
    const { showToast } = useToast();
    
    // Local state for settings form
    const [userName, setUserName] = useState<string>(config.userProfile.name || 'User');
    const [userColor, setUserColor] = useState<string>(config.userProfile.color);
    
    // Security State
    const [email, setEmail] = useState<string | null>(null);
    const [isManualRegistration, setIsManualRegistration] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [isSecurityOpen, setIsSecurityOpen] = useState(false);
    
    useEffect(() => {
        try {
            const token = localStorage.getItem('auth_token'); // Corrected key from previous auth_jwt
            if(token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setEmail(payload.email);
                // Respect manual_registration flag if present, otherwise default to True if authProvider is 'email'
                if(payload.manual_registration !== undefined) {
                     setIsManualRegistration(payload.manual_registration);
                } else {
                     // Fallback for older tokens/users: assume true if using email provider
                     setIsManualRegistration(authProvider === 'email');
                }
            }
        } catch(e) {}
    }, [authProvider]);

    const handleLogout = () => {
        if(confirm(t('settings.logout.confirm'))) {
            logout();
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            showToast("Fill all password fields", "error");
            return;
        }
        if (newPassword.length < 6) {
            showToast("New password is too short", "error");
            return;
        }

        setIsChangingPass(true);
        try {
            const res = await fetch(`${API_URL}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, oldPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Password updated successfully", "success");
                setOldPassword('');
                setNewPassword('');
            } else {
                showToast(data.error || "Failed to update password", "error");
            }
        } catch (e) {
            showToast("Server error", "error");
        } finally {
            setIsChangingPass(false);
        }
    };

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
                const now = Date.now();
                // Update Local Context
                updateConfig({
                    ...config,
                    userProfile: {
                        ...config.userProfile,
                        name: userName,
                        color: userColor,
                        lastUpdated: now 
                    }
                });

                // Update Backend (Persist)
                const token = localStorage.getItem('auth_token');
                if (token) {
                    fetch(`${API_URL}/profile`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ visible: true, name: userName, color: userColor, profileUpdatedAt: now })
                    }).catch(e => console.error("Profile Sync Failed", e));
                }
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [userName, userColor, email, config]); // added config to deps to ensure we have latest version



    const handleClearData = async () => {
        if(window.confirm("Are you sure? This will delete all local data.")) {
            try {
                await dbOp('nodes', 'readwrite', 'clear');
                await dbOp('edges', 'readwrite', 'clear');
                await dbOp('comments', 'readwrite', 'clear');
                refreshData(); 
                
                // Clear URL
                const url = new URL(window.location.href);
                url.searchParams.delete('token');
                url.searchParams.delete('invite_token');
                window.history.replaceState({}, document.title, url.pathname); // Keep pathname, remove query

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

            {/* Security Section (Change Password) */}
            {email && (
            <div className="border border-indigo-100 dark:border-indigo-900 rounded-lg bg-indigo-50/50 dark:bg-slate-800 p-3 space-y-3">
                <button 
                    onClick={() => setIsSecurityOpen(!isSecurityOpen)}
                    className="w-full flex items-center justify-between group"
                >
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('settings.security')}</span>
                    </div>
                    {isSecurityOpen ? <ChevronUp size={14} className="text-gray-400 group-hover:text-indigo-600"/> : <ChevronDown size={14} className="text-gray-400 group-hover:text-indigo-600"/>}
                </button>
                
                {isSecurityOpen && (
                <div className="animate-fade-in space-y-3 pt-2">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded border border-indigo-100 dark:border-slate-700">
                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">{t('settings.email')}</div>
                        <div className="text-xs font-mono text-gray-700 dark:text-gray-300 flex items-center justify-between">
                            {email}
                            {authProvider !== 'email' && (
                                <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{authProvider}</span>
                            )}
                        </div>
                    </div>

                    {authProvider === 'email' && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{t('settings.pass.title')}</div>
                        {isManualRegistration ? (
                        <div className="space-y-2 pt-2">
                             <div className="text-[10px] uppercase font-bold text-gray-400">{t('settings.security')}</div>
                            <input 
                                type="password"
                                placeholder={t('settings.pass.current')}
                                value={oldPassword} 
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded p-1.5 text-xs outline-none focus:border-indigo-400 mb-1"
                            />
                            <input 
                                type="password"
                                placeholder={t('settings.pass.new')}
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded p-1.5 text-xs outline-none focus:border-indigo-400"
                            />
                            <button 
                                onClick={handleChangePassword}
                                disabled={isChangingPass}
                                className="w-full text-xs bg-indigo-600 text-white rounded py-1.5 font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isChangingPass ? t('settings.pass.updating') : t('settings.pass.update')}
                            </button>
                        </div>
                        ) : (
                         <div className="text-[10px] text-center text-gray-400 italic bg-gray-50 dark:bg-slate-900/50 p-2 rounded">
                            {t('settings.security.info')}
                        </div>
                        )}
                </div>
                )}
            </div>
            )}
            </div>
            )}

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
                    <HelpCircle size={14} /> {t('settings.help')}
                </button>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                >
                    <LogOut size={16} />
                    {t('settings.logout')}
                </button>
            </div>

            <div className="text-center text-[10px] text-gray-300 pt-4">
                v1.0.0 • Local Storage Mode
            </div>
        </div>
    );
};
