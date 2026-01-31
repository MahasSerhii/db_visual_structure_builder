import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    isDanger = false 
}) => {
    if (!isOpen) return null;

    const showCancel = cancelText !== "";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {isDanger && <AlertTriangle size={18} className="text-red-500" />}
                        {title}
                    </h3>
                    {showCancel && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                            <X size={18} />
                        </button>
                    )}
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-gray-600 leading-relaxed text-center whitespace-pre-line">
                        {message}
                    </p>
                </div>

                <div className="flex bg-gray-50 p-4 gap-3">
                    {showCancel && (
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button 
                        onClick={() => { onConfirm(); }}
                        className={`flex-1 py-2 px-4 text-sm font-medium text-white rounded-lg shadow-sm transition ${
                            isDanger 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
