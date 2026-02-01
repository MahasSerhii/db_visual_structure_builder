import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, X, Clock } from 'lucide-react';

interface ProjectDeletedModalProps {
    isOpen: boolean;
    onBackup: (type: 'json' | 'csv') => void;
    onSkip: () => void;
    autoCloseTimeSeconds?: number;
    isTabActive?: boolean;
}

export const ProjectDeletedModal: React.FC<ProjectDeletedModalProps> = ({ 
    isOpen, 
    onBackup, 
    onSkip, 
    autoCloseTimeSeconds = 60,
    isTabActive = true // Default to true if not provided (legacy/single tab)
}) => {
    const [timeLeft, setTimeLeft] = useState(autoCloseTimeSeconds);

    useEffect(() => {
        if (!isOpen) {
            setTimeLeft(autoCloseTimeSeconds);
            return;
        }

        // Pause timer if tab is not active
        if (!isTabActive) {
            return; 
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onSkip(); // Auto-skip/disconnect on timeout
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, onSkip, autoCloseTimeSeconds]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center justify-center text-center border-b border-red-100 dark:border-red-900/30">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-800/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Project Deleted
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        The Admin has deleted this room. You have been disconnected.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <strong>Would you like to save a local backup?</strong>
                            <p className="mt-1 text-xs opacity-80">
                                You can download the current state of the graph before leaving.
                            </p>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-500">
                            <Clock size={12} />
                            {isTabActive ? (
                                <span>Disconnecting in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                            ) : (
                                <span>Timer paused (Tab inactive)</span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                             <button
                                onClick={() => onBackup('json')}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                <Download size={16} /> JSON Backup
                            </button>
                             <button
                                onClick={() => onBackup('csv')}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                <Download size={16} /> CSV Backup
                            </button>
                        </div>
                        
                        <button
                            onClick={onSkip}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg transition-all"
                        >
                            <X size={16} /> Skip & Disconnect
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
