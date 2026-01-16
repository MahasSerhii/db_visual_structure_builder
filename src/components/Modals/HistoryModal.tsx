import React from 'react';
import { X, Clock, Activity } from 'lucide-react';
import { useGraph } from '../../context/GraphContext';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
    const { history } = useGraph();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col overflow-hidden relative animate-scale-in">
                <div className="p-6 border-b border-gray-100 flex-shrink-0 bg-white relative z-10 flex justify-between items-center">
                     <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                         <Activity className="text-indigo-600" />
                         Activity History
                     </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl z-20">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 bg-gray-50/50">
                    {history.length === 0 ? (
                        <div className="space-y-4 text-center text-gray-400 mt-20">
                            <Clock size={48} className="mx-auto text-gray-300" />
                            <p>No activity recorded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((item) => (
                                <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">{item.action}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-mono">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
