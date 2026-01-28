import React from 'react';
import { Lock } from 'lucide-react';

interface FirebaseConfigSectionProps {
    t: (key: string) => string;
    configError: string | null;
    isClientMode: boolean;
    isAuthenticated: boolean;
    firebaseConfig: string;
    setFirebaseConfig: (val: string) => void;
    rememberMe: boolean;
    setRememberMe: (val: boolean) => void;
    handleInitFirebase: () => void;
    setAuthModalOpen: (val: boolean) => void;
}

export const FirebaseConfigSection: React.FC<FirebaseConfigSectionProps> = ({
    t, configError, isClientMode, isAuthenticated, firebaseConfig, setFirebaseConfig,
    rememberMe, setRememberMe, handleInitFirebase, setAuthModalOpen
}) => {
    return (
        <div id="fb-config-section" className="min-h-[120px] flex flex-col justify-center items-center w-full">
            {configError && (
                <div className="mb-2 p-2 bg-red-50 text-red-600 text-[10px] rounded border border-red-100 font-medium dark:bg-red-900/30 dark:text-red-300 dark:border-red-900">
                    {configError}
                </div>
            )}
            {!isClientMode ? (
                <>
                    {isAuthenticated ? (
                        <>
                            <textarea 
                                value={firebaseConfig}
                                onChange={(e) => setFirebaseConfig(e.target.value)}
                                rows={3} 
                                placeholder={t('data.paste')} 
                                className="w-full text-[10px] p-2 border border-gray-200 rounded mb-2 font-mono dark:bg-slate-900 dark:border-slate-600 dark:text-gray-200"
                            ></textarea>
                            
                            <div className="flex items-center mb-2">
                                <input 
                                    id="fb-remember" 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" 
                                />
                                <label htmlFor="fb-remember" className="ml-2 text-xs text-gray-600 dark:text-gray-400">{t('data.remember')}</label>
                            </div>

                            <button onClick={handleInitFirebase} className="w-full py-1.5 text-xs bg-gray-900 text-white rounded font-medium hover:bg-gray-800 transition dark:bg-slate-700 dark:hover:bg-slate-600">{t('data.set')}</button>
                        </>
                    ) : (
                        <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                            <Lock size={20} className="mx-auto text-gray-400 mb-2" />
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('auth.required')}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 leading-tight">
                               {t('auth.liveSync.desc')}
                            </p>
                            <button 
                                onClick={() => setAuthModalOpen(true)}
                                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition"
                            >
                                {t('auth.signin')}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-xs text-gray-500 text-center py-2 animate-pulse dark:text-gray-400">Initializing Client Mode...</div>
            )}
        </div>
    );
};
