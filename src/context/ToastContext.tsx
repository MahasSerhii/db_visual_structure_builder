import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        // Limit to 3 toasts to prevent screen blocking
        setToasts(prev => [...prev.slice(-2), { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        className={`
                            pointer-events-auto
                            max-w-[300px] w-full min-h-[48px] rounded-lg shadow-xl border flex items-start p-3 gap-3 animate-slide-in-right transition-all
                            ${toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : ''}
                            ${toast.type === 'error' ? 'bg-white border-red-200 text-red-700' : ''}
                            ${toast.type === 'info' ? 'bg-white border-blue-200 text-blue-700' : ''}
                            ${toast.type === 'warning' ? 'bg-white border-yellow-200 text-yellow-700' : ''}
                        `}
                    >
                        <div className="mt-0.5 shrink-0">
                            {toast.type === 'success' && <CheckCircle size={18} />}
                            {toast.type === 'error' && <AlertCircle size={18} />}
                            {toast.type === 'info' && <Info size={18} />}
                            {toast.type === 'warning' && <AlertCircle size={18} />}
                        </div>
                        
                        <span className="text-xs font-semibold break-words leading-tight pt-0.5 whitespace-normal w-full">{toast.message}</span>
                        
                        <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 shrink-0 ml-auto">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
