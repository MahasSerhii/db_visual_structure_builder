import React, { useState } from 'react';
import { Unplug, Radio, LogIn, Lock, RefreshCw, AlertTriangle, Power, Globe, PauseCircle, PlayCircle, Trash2, CheckCircle2, Copy, Wifi, WifiOff } from 'lucide-react';
import { LoadingKitty } from '../../../UI/LoadingKitty';
import { ConnectionStatus } from '../../../../context/GraphContext';
import { useToast } from '../../../../context/ToastContext';

interface RoomConnectionSectionProps {
    t: (key: string) => string;
    isClientMode: boolean;
    isConnected: boolean;
    isRestoringSession: boolean;
    isLiveMode: boolean;
    projectId: string; // This is the ID used for operations (or input)
    displayProjectId?: string; // This is the ID to show to the user (e.g. share code)
    projectName?: string;
    setProjectId: (val: string) => void;
    handleDeleteDB: () => void;
    handleDisconnect: () => void;
    showLoginUI: boolean;
    loginEmail: string;
    setLoginEmail: (val: string) => void;
    handleLoginRequest: () => void;
    isLoggingIn: boolean;
    isConnecting: boolean;
    connectionStatus: ConnectionStatus;
    handleConnect: (live: boolean) => void;
    toggleLiveMode: (target: boolean) => void;
    lastSyncTime: Date | null;
    isAuthenticated: boolean;
    onOpenAuthModal: () => void;
}

export const RoomConnectionSection: React.FC<RoomConnectionSectionProps> = ({
    t, isClientMode, isConnected, isRestoringSession, isLiveMode, projectId, displayProjectId, projectName, setProjectId,
    handleDeleteDB, handleDisconnect, isConnecting, connectionStatus, handleConnect, toggleLiveMode, lastSyncTime,
    isAuthenticated, onOpenAuthModal
}) => {
    const { showToast } = useToast();

    // Status Logic
    const isLiveActive = isLiveMode && connectionStatus === 'connected';
    const isLiveConnecting = isLiveMode && (connectionStatus === 'connecting' || connectionStatus === 'reconnecting' || (isConnecting && connectionStatus !== 'connected'));
    const isLiveFailed = isLiveMode && connectionStatus === 'failed';
    
    // Prefer showing the display ID (Share Code) if available, otherwise fallback to known ID
    const visibleProjectId = displayProjectId || projectId;

    // UI State

    const copyProjectId = () => {
        navigator.clipboard.writeText(visibleProjectId);
        showToast(t('toast.copied'), 'success');
    };

    if (isRestoringSession && isLiveMode) {
        return (
            <div className="py-8 flex flex-col justify-center items-center w-full space-y-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800">
                <LoadingKitty size={40} />
                <p className="text-indigo-400 animate-pulse font-bold text-[10px] uppercase tracking-wider">{t('lbl.restoring')}</p>
            </div>
        );
    }

    // STATE 1: Not Authenticated
    // If we are logged out, we should NOT see the input form.
    if (!isAuthenticated) {
        return (
            <div className="w-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center shadow-sm">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Lock size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-2">{t('auth.required')}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed px-2">
                    {t('data.room.loginMsg')}
                </p>
                <button
                    onClick={onOpenAuthModal}
                    className="w-full py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow hover:shadow-md"
                >
                    <LogIn size={14} strokeWidth={2.5} /> {t('auth.signin')}
                </button>
            </div>
        );
    }

    // STATE 2: Connected
    if (isConnected) {
        return (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Status Card */}
                <div className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${isLiveActive
                        ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/50'
                        : isLiveFailed
                            ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/50'
                            : 'bg-slate-50/50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'
                    }`}>
                    <div className="p-4 relative z-10">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full shadow-sm ${isLiveActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' :
                                        isLiveFailed ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' :
                                            'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                    }`}>
                                    {isLiveActive ? <Wifi size={18} strokeWidth={2.5} /> : isLiveFailed ? <AlertTriangle size={18} strokeWidth={2.5} /> : <WifiOff size={18} strokeWidth={2.5} />}
                                </div>
                                <div>
                                    <h5 className={`text-xs font-bold uppercase tracking-wide leading-none ${isLiveActive ? 'text-emerald-700 dark:text-emerald-400' :
                                            isLiveFailed ? 'text-red-700 dark:text-red-400' :
                                                'text-slate-600 dark:text-slate-400'
                                        }`}>
                                        {isLiveActive ? 'Live Sync' : isLiveFailed ? 'Failed' : 'Local Mode'}
                                    </h5>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                        {isLiveActive && lastSyncTime ? `Synced ${lastSyncTime.toLocaleTimeString()}` : 'Changes saved locally'}
                                    </span>
                                </div>
                            </div>

                            {/* Live Toggle */}
                            <button
                                onClick={() => toggleLiveMode(!isLiveMode)}
                                className={`p-2 rounded-lg transition-all active:scale-95 ${isLiveMode
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'
                                    }`}
                                title={isLiveMode ? "Pause Sync" : "Resume Sync"}
                            >
                                {isLiveMode ? <PauseCircle size={18} strokeWidth={2.5} /> : <PlayCircle size={18} strokeWidth={2.5} />}
                            </button>
                        </div>
                        <div className='flex gap-2'>
                            {/* Room Info */}
                            <div className="flex-1 text-xs px-3 py-2.5 bg-white border border-indigo-100 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500">
                                <div className="flex flex-col gap-0.5 overflow-hidden">
                                     <div className="flex items-center gap-1.5 overflow-hidden" title={projectName || t('project.unnamed')}>
                                        <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50">Room</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                                            {projectName || (displayProjectId ? `Project ${displayProjectId.substr(0, 6)}` : t('project.unnamed'))}
                                        </span>
                                     </div>
                                    <code className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate pl-0.5" title={visibleProjectId}>
                                        ID: {visibleProjectId}
                                    </code>
                                </div>
                            </div>
                            {/* Primary Actions */}
                            {/* Disconnect Button */}
                            <div className="relative group">
                                <button
                                    className="bg-white text-indigo-600 border border-indigo-200 w-[38px] h-[38px] rounded-lg text-xs font-medium hover:bg-indigo-50 active:scale-95 flex items-center justify-center transition-all shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-slate-700 mr-0"
                                    aria-label={t('data.disconnect')}
                                    onClick={handleDisconnect}
                                >
                                    <Unplug size={14} />
                                </button>

                                {/* Tooltip */}
                                <div className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0">
                                    {t('data.disconnect')}
                                    <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                            </div>

                            {/* Delete room Button (Small) */}
                            {!isClientMode && (
                                <div className="relative group">
                                    <button
                                        className="bg-white text-red-500 border border-indigo-200 w-[38px] h-[38px] rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95 flex items-center justify-center transition-all shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white mr-1"
                                        onClick={handleDeleteDB}
                                        aria-label={t('data.deleteDB')}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0">
                                        {t('data.deleteDB')}
                                        <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // STATE 3: Not Connected (Input)
    return (
        <div className="w-full space-y-3">
            <div className="relative group">
                <input
                    type="text"
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    placeholder={t('data.ph.projectId')}
                    className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm group-hover:border-indigo-300 dark:group-hover:border-indigo-700 text-slate-800 dark:text-slate-200"
                />
            </div>

            <button
                onClick={() => handleConnect(true)}
                disabled={isConnecting || !projectId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 text-sm"
            >
                {isConnecting ? (
                    <RefreshCw className="animate-spin" size={18} />
                ) : (
                    <Globe size={18} />
                )}
                {isConnecting ? t('status.connecting') : t('data.btn.connect')}
            </button>

            <div className="flex items-center justify-center gap-2 pt-1 opacity-60">
                <div className="h-px bg-slate-300 dark:bg-slate-700 w-1/4"></div>
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">OR</span>
                <div className="h-px bg-slate-300 dark:bg-slate-700 w-1/4"></div>
            </div>
        </div>
    );
};
