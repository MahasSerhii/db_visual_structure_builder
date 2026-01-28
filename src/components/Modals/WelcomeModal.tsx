import React, { useState } from 'react';
import { useGraph } from '../../context/GraphContext';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
    const { config, updateConfig, t } = useGraph();
    const [nickname, setNickname] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        // If nickname is empty, use 'Guest'. 
        // NOTE: The backend will use this name if provided during registration, 
        // OR if login happens, the backend name might overwrite this if sync is active.
        const name = nickname.trim() || 'Guest';
        updateConfig({
            ...config,
            userProfile: {
                ...config.userProfile,
                name: name,
                // Only update timestamp if name actually changed? 
                // Currently just refreshing it is fine.
                lastUpdated: Date.now()
            }
        });
        
        // Also ensure username is in localStorage for immediate access
        localStorage.setItem('my_user_name', name);
        onClose();
    };

    const handleSkip = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md transform transition-all scale-100 opacity-100">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">👋</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{t('welcome.title')}</h2>
                    <p className="text-gray-600 mt-2">{t('welcome.desc')}</p>
                    <p className="text-xs text-gray-400 mt-2 italic px-4">
                       If you already have an account, your existing name will be used after login. You can skip this step.
                    </p>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('welcome.lbl.nick')}</label>
                        <input 
                            type="text" 
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                            placeholder={t('welcome.nick.ph')} 
                        />
                        <p className="text-[10px] text-gray-400 mt-1">{t('welcome.nick.desc')}</p>
                    </div>
                    
                    <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition shadow-lg transform active:scale-95">
                        {t('welcome.btn.start')}
                    </button>
                    
                    <button onClick={handleSkip} className="w-full bg-white hover:bg-gray-50 text-gray-500 font-medium py-2 rounded-lg transition border border-gray-200">
                        {t('welcome.btn.skip')}
                    </button>
                </div>
            </div>
        </div>
    );
};
