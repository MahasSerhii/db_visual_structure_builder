import React from 'react';
import { Unplug, Radio, LogIn, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { LoadingKitty } from '../../../UI/LoadingKitty';
import { ConnectionStatus } from '../../../../context/GraphContext'; 

interface RoomConnectionSectionProps {
    t: (key: string) => string;
    isClientMode: boolean;
    isConnected: boolean;
    isRestoringSession: boolean;
    isLiveMode: boolean;
    roomId: string;
    setRoomId: (val: string) => void;
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
    t, isClientMode, isConnected, isRestoringSession, isLiveMode, roomId, setRoomId,
    handleDeleteDB, handleDisconnect, showLoginUI, loginEmail, setLoginEmail,
    handleLoginRequest, isLoggingIn, isConnecting, connectionStatus, handleConnect, toggleLiveMode, lastSyncTime,
    isAuthenticated, onOpenAuthModal
}) => {
    
    // Status Logic
    const isLiveActive = isLiveMode && connectionStatus === 'connected';
    const isLiveConnecting = isLiveMode && (connectionStatus === 'connecting' || connectionStatus === 'reconnecting' || (isConnecting && connectionStatus !== 'connected'));
    const isLiveFailed = isLiveMode && connectionStatus === 'failed';

    if (isRestoringSession && isLiveMode) {
        return (
            <div id="fb-room-section" className="min-h-[120px] flex flex-col justify-center items-center w-full space-y-2">
                <LoadingKitty size={40} />
                <p className="text-gray-400 animate-pulse font-medium text-[10px] uppercase tracking-wider">Restoring...</p>
            </div>
        );
    }

    return (
        <div id="fb-room-section" className="min-h-[120px] flex flex-col justify-center items-center w-full">
            {(isAuthenticated || isConnected) && (
                <div className="flex justify-between items-end mb-1 w-full">
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400">
                        {isConnected ? (isClientMode ? t('data.room.connected') : `Room: ${roomId}`) : t('data.room')}
                    </label>
                    <div className="flex gap-2 items-center">
                        {!isClientMode && isConnected && (
                            <button 
                                onClick={handleDeleteDB} 
                                disabled={isConnecting || isLiveConnecting}
                                className={`text-[9px] transition mb-0.5 font-bold underline px-1 rounded ${
                                    (isConnecting || isLiveConnecting)
                                    ? 'text-gray-300 dark:text-slate-600 bg-gray-50 dark:bg-slate-800 cursor-not-allowed' 
                                    : 'text-red-800 hover:text-red-900 bg-red-100 dark:bg-red-900/50 dark:text-red-300 dark:hover:text-red-200'
                                }`}
                            >
                                {t('data.deleteDB')}
                            </button>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDisconnect(); }} 
                            disabled={isLiveConnecting}
                            className={`px-2 py-0.5 border rounded text-[10px] font-bold transition shadow-sm active:scale-95 ${
                                isLiveConnecting 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-gray-600'
                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/40'
                            }`}
                        >
                            {t('data.disconnect')}
                        </button>
                    </div>
                </div>
            )}
            
            {/* INPUT FIELD - Only show when NOT connected and NOT showing login UI */}
            {!isConnected && !showLoginUI && isAuthenticated && (
                <div className="relative w-full">
                    <input 
                        value={isClientMode ? (isConnected ? t('data.room.connected') : t('data.room.pending')) : roomId}
                        onChange={(e) => !isClientMode && setRoomId(e.target.value)}
                        type={isClientMode ? "password" : "text"} 
                        placeholder={t('data.room.placeholder')}
                        className="w-full text-xs p-2 border border-gray-200 rounded mb-2 font-bold text-indigo-700 disabled:bg-indigo-50/50 disabled:text-indigo-400 dark:bg-slate-900 dark:border-slate-600 dark:text-indigo-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                        disabled={isConnected || isClientMode || isConnecting || isRestoringSession}
                    />
                </div>
            )}
            
            <div className="flex gap-2 w-full">
                {!isConnected ? (
                    (!isAuthenticated) ? (  // Show login UI if NOT Authenticated
                        <div className="w-full space-y-2">
                            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-center dark:bg-indigo-900/20 dark:border-indigo-900/50">
                                <Lock size={16} className="mx-auto text-indigo-500 mb-1" />
                                <div className="text-xs font-bold text-indigo-800 dark:text-indigo-200">{t('auth.required')}</div>
                                <div className="text-[10px] text-indigo-700 mb-2 dark:text-indigo-300">{t('data.room.loginMsg')}</div>
                                
                                <button 
                                    onClick={onOpenAuthModal} 
                                    className="w-full py-1.5 text-xs bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                                >
                                    <LogIn size={12}/> {t('auth.signin')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            id="btn-connect" 
                            onClick={() => handleConnect(true)} 
                            disabled={isConnecting}
                            className={`flex-1 py-1.5 text-xs text-white rounded font-medium transition shadow-sm ${isConnecting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600'}`}
                        >
                            {isConnecting ? t('data.room.pending') : t('data.connect')}
                        </button>
                    )
                ) : (
                    <div className="flex-1 flex gap-2 w-full">
                        <button 
                            onClick={() => toggleLiveMode(false)}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-[10px] font-bold uppercase rounded-md transition-all border ${
                                !isLiveMode 
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm' 
                                : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
                            }`}
                        >
                            <Unplug size={14}/> Local
                        </button>
                        <button 
                            onClick={() => toggleLiveMode(true)}
                            disabled={isConnecting || (isLiveMode && (connectionStatus === 'connected' || connectionStatus === 'connecting'))}
                            title={isLiveFailed ? "Connection Failed - Click to Retry" : (isLiveActive ? "Live Sync Active" : "Enable Live Sync")}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-[10px] font-bold uppercase rounded-md transition-all border ${
                                isLiveActive 
                                ? 'bg-green-600 text-white border-green-600 shadow-sm' 
                                : isLiveFailed 
                                    ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 cursor-pointer' 
                                    : isLiveConnecting 
                                        ? 'bg-yellow-50 text-yellow-600 border-yellow-200 cursor-wait dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
                                        : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
                            }`}
                        >
                             {isLiveConnecting && <RefreshCw size={12} className="animate-spin mr-1"/>}
                             {!isLiveConnecting && isLiveFailed && <RefreshCw size={12} className="mr-1"/>}
                             {isLiveFailed ? "Retry" : "Live"}
                             {!isLiveConnecting && !isLiveFailed && <Radio size={14} className={isLiveActive ? "animate-pulse" : ""}/>}
                             {isLiveFailed && <AlertTriangle size={12} className="ml-1"/>}
                        </button>
                    </div>
                )}
            </div>
            
            <div className="h-[24px] flex items-end justify-center mb-1">
                {lastSyncTime && isConnected && isLiveMode ? (
                    <div className="text-[9px] text-gray-400 text-center animate-in fade-in slide-in-from-top-1">
                        Last synced: {lastSyncTime.toLocaleTimeString()}
                    </div>
                ) : (
                    <div className="text-[9px] text-transparent select-none">
                        Reference
                    </div>
                )}
            </div>
        </div>
    );
};
