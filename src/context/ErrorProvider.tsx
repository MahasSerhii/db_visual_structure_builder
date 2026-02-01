import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { ApiError } from '../api/client';
import { getTranslation } from '../utils/translations';
import { Language } from '../utils/types';

interface ErrorContextType {
    showError: (error: unknown) => void;
    wrap: <T>(promise: Promise<T>) => Promise<T>;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
    const { showToast } = useToast();

    const getLanguage = (): Language => {
        try {
            const saved = localStorage.getItem('app_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.language || 'en';
            }
        } catch (e) {
            console.warn("Failed to read language from config", e);
        }
        return 'en';
    };

    const showError = useCallback((error: unknown) => {
        // console.error("Captured Error:", error);

        const lang = getLanguage();
        let message = 'An unexpected error occurred';
        
        if (error instanceof ApiError) {
             // Prioritize Backend Message as it should already be localized (v2 strategy)
             if (error.message && error.message !== 'Internal Server Error' && !error.message.startsWith('error.')) {
                 message = error.message;
             }
             else if (error.code) {
                // Fallback to client-side translation if backend pushed raw code or generic message
                const translationKey = `error.${error.code}`;
                const translated = getTranslation(lang, translationKey);
                
                if (translated && translated !== translationKey) {
                    message = translated;
                } else {
                    message = error.message || 'Unknown Server Error';
                }
             }
        } else if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        showToast(message, 'error');
    }, [showToast]);

    const wrap = useCallback(async <T,>(promise: Promise<T>): Promise<T> => {
        try {
            return await promise;
        } catch (error) {
            showError(error);
            throw error; // Re-throw so component can update loading state if needed
        }
    }, [showError]);

    return (
        <ErrorContext.Provider value={{ showError, wrap }}>
            {children}
        </ErrorContext.Provider>
    );
};

export const useError = () => {
    const context = useContext(ErrorContext);
    if (context === undefined) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
};
