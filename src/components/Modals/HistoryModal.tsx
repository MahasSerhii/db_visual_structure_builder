import React, { useState } from 'react';
import { RotateCcw, X, Clock, Activity, Trash2 } from 'lucide-react';
import { useGraph, GraphSnapshot, HistoryItem } from '../../context/GraphContext';
import { ConfirmationModal } from './ConfirmationModal';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
    const { history, restoreSnapshot, isReadOnly, t, clearHistory } = useGraph();
    const [showConfirm, setShowConfirm] = useState(false);

    if (!isOpen) return null;

    // Only allow clearing history if:
    // 1. Not ReadOnly
    // 2. We have history
    // 3. (Optional) We are Host if in Live Mode? 
    //    For now, checkReadOnly() in clearHistory handles permission basics, and backend checks 'admin'/'host'
    const canClear = !isReadOnly && history.length > 0;

    const handleRevert = (itemOrSnapshot: GraphSnapshot | HistoryItem) => {
        let snap: GraphSnapshot | undefined;
        // Check if it's already a snapshot (has nodes array)
        if ('nodes' in itemOrSnapshot) {
             snap = itemOrSnapshot as GraphSnapshot;
        } else {
             // It's a HistoryItem
             snap = (itemOrSnapshot as HistoryItem).snapshot;
        }

        if (snap && confirm(t('history.revertConfirm'))) {
             restoreSnapshot(snap);
             onClose();
        }
    };

    const confirmClear = () => {
        clearHistory();
        setShowConfirm(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
                <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col overflow-hidden relative animate-scale-in">
                    <div className="p-6 border-b border-gray-100 flex-shrink-0 bg-white relative z-10 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Activity className="text-indigo-600" />
                                {t('history.title')}
                            </h2>
                            {canClear && (
                                <button 
                                    onClick={() => setShowConfirm(true)}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100 transition-colors border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                                    title={t('history.clear.tooltip')}
                                >
                                    <Trash2 size={12}/> {t('history.clear.btn')}
                                </button>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl z-20">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-6 bg-gray-50/50">
                        {history.length === 0 ? (
                            <div className="space-y-4 text-center text-gray-400 mt-20">
                                <Clock size={48} className="mx-auto text-gray-300" />
                                <p>{t('history.empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {history.map((item) => (
                                    <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-800 text-sm">{item.action}</h4>
                                                {item.isRevertAction && <span className="text-[10px] uppercase bg-amber-100 text-amber-800 px-1 rounded font-bold">{t('history.undo')}</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                                                    {item.author}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {new Date(item.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                        {(item.snapshot || item.canRevert) && !isReadOnly && !item.isRevertAction && (
                                            <button 
                                                onClick={() => handleRevert(item.snapshot || item)}
                                                className="ml-4 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-md border border-amber-200 hover:bg-amber-100 transition"
                                                title={t('history.revertTooltip')}
                                            >
                                                <RotateCcw size={12} /> {t('history.revert')}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmClear}
                title={t('history.clear.modal.title')}
                message={t('history.clear.modal.message')}
                confirmText={t('history.clear.modal.confirm')}
                isDanger={true}
            />
        </>
    );
};
