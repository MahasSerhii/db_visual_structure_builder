import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ClearGraphModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (clearLocal: boolean, clearLive: boolean) => void;
    isLiveMode: boolean;
    t: (key: string) => string;
}

export const ClearGraphModal: React.FC<ClearGraphModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLiveMode,
    t,
}) => {
    const [clearLocal, setClearLocal] = useState(true);
    const [clearLive, setClearLive] = useState(isLiveMode);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(clearLocal, clearLive);
        onClose();
        // Reset checkboxes for next time
        setClearLocal(true);
        setClearLive(isLiveMode);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-scale-in dark:bg-slate-800">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 dark:bg-slate-900 dark:border-slate-700">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 dark:text-gray-100">
                        <AlertTriangle size={20} className="text-red-500" />
                        {t('clear.graphTitle')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition dark:hover:text-gray-300"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Warning Message */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-900/20 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-200">
                            <strong>{t('warning')}:</strong> {t('clear.graphWarning')}
                        </p>
                    </div>

                    {/* Clear Local Graph Checkbox */}
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="clearLocal"
                            checked={clearLocal}
                            onChange={(e) => setClearLocal(e.target.checked)}
                            className="mt-1 w-4 h-4 text-indigo-600 rounded cursor-pointer"
                        />
                        <label htmlFor="clearLocal" className="cursor-pointer flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                                {t('clear.clearLocalGraph')}
                            </div>
                            <div className="text-xs text-gray-600 mt-1 dark:text-gray-400">
                                {t('clear.clearLocalDesc')}
                            </div>
                        </label>
                    </div>

                    {/* Clear Live Graph Checkbox */}
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="clearLive"
                            checked={clearLive}
                            onChange={(e) => setClearLive(e.target.checked)}
                            className="mt-1 w-4 h-4 text-indigo-600 rounded cursor-pointer"
                        />
                        <label htmlFor="clearLive" className="cursor-pointer flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                                {t('clear.clearLiveGraph')}
                            </div>
                            <div className="text-xs text-gray-600 mt-1 dark:text-gray-400">
                                {t('clear.clearLiveDesc')}
                            </div>
                        </label>
                    </div>

                    {/* Info Message */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-900/20 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-200">
                            <strong>{t('info')}:</strong>{' '}
                            {isLiveMode
                                ? t('clear.infoLiveMode')
                                : t('clear.infoLocalMode')}
                        </p>
                    </div>
                </div>

                <div className="flex bg-gray-50 dark:bg-slate-900 p-4 gap-3 border-t border-gray-100 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!clearLocal && !clearLive}
                        className="flex-1 py-2 px-4 text-sm font-medium text-white rounded-lg shadow-sm transition bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {t('clear.clearGraph')}
                    </button>
                </div>
            </div>
        </div>
    );
};
