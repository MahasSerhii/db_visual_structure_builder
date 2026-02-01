import React, { useState } from 'react';
import { FileSpreadsheet, Database, Upload, History, ChevronDown, ChevronUp, Settings, Trash2 } from 'lucide-react';

interface DataActionsSectionProps {
    t: (key: string) => string;
    setCSVModalOpen: (val: boolean) => void;
    exportJSON: () => void;
    isReadOnly: boolean;
    handleImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
    setHistoryModalOpen: (val: boolean) => void;
    setClearGraphModalOpen: (val: boolean) => void;
}

export const DataActionsSection: React.FC<DataActionsSectionProps> = ({
    t, setCSVModalOpen, exportJSON, isReadOnly, handleImportFile, setHistoryModalOpen, setClearGraphModalOpen
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 mt-3">
             <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition dark:bg-slate-800 dark:hover:bg-slate-700"
            >
                 <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-400">
                     <Settings size={14} />
                     {t('dataExport')}
                 </div>
                 {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
             </button>

             {isOpen && (
                <div className="p-3 grid grid-cols-1 gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                    <button 
                        onClick={() => setCSVModalOpen(true)} 
                        className={`w-full text-left p-4 text-xs font-medium rounded-xl transition flex items-center gap-3 border shadow-sm bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700`}
                    >
                        <FileSpreadsheet size={24} className="text-slate-600 dark:text-slate-400" />
                        <div>
                            <div className="font-bold">{t('data.excel')}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">{t('data.actions.excelDesc')}</div>
                        </div>
                    </button>
                    
                    <button onClick={exportJSON} className="w-full text-left p-4 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition flex items-center gap-3 border border-indigo-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700">
                        <Database size={24} className="text-slate-600 dark:text-slate-400" />
                        <div>
                            <div className="font-bold">{t('data.export')}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">{t('data.actions.exportDesc')}</div>
                        </div>
                    </button>
                    
                    <label className={`w-full text-left p-4 text-xs font-medium rounded-xl transition flex items-center gap-3 border shadow-sm ${
                            isReadOnly 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-600' 
                            : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700'
                        }`}>
                        <Upload size={24} className={isReadOnly ? "text-slate-400 dark:text-slate-600" : "text-slate-600 dark:text-slate-400"} />
                        <div>
                            <div className="font-bold">{t('data.import')}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">{isReadOnly ? t('data.actions.importDisabled') : t('data.actions.importDesc')}</div>
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleImportFile} 
                            disabled={isReadOnly}
                        />
                    </label>
                    
                    <button onClick={() => setHistoryModalOpen(true)} className="w-full text-left p-4 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition flex items-center gap-3 border border-indigo-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700">
                        <History size={24} className="text-slate-600 dark:text-slate-400" />
                        <div>
                            <div className="font-bold">{t('data.history')}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">{t('data.actions.historyDesc')}</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => setClearGraphModalOpen(true)} 
                        className={`w-full text-left p-4 text-xs font-medium rounded-xl transition flex items-center gap-3 border shadow-sm ${
                            isReadOnly 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-600' 
                            : 'bg-white border-red-200 text-red-600 hover:bg-red-50 dark:bg-slate-800 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20'
                        }`}
                        disabled={isReadOnly}
                    >
                        <Trash2 size={24} className={isReadOnly ? "text-slate-400 dark:text-slate-600" : "text-slate-600 dark:text-slate-400"} />
                        <div>
                            <div className="font-bold">{t('clear.graphTitle')}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">{t('data.actions.clearDesc')}</div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};
