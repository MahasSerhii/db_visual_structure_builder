import React from 'react';
import { X, ChevronDown, Plus, FileSpreadsheet, Download, Bot } from 'lucide-react';
import { Chatbot } from '../Chatbot/Chatbot';
import { useGraph } from '../../context/GraphContext';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const { t } = useGraph();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl shadow-2xl h-[85vh] flex flex-col overflow-hidden relative">
                 <div className="bg-gray-100 p-6 flex justify-between items-center border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">{t('settings.help')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                    
                    {/* AI Chatbot Section */}
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-5 rounded-xl border border-indigo-100 mb-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 text-lg">{t('help.ai.title')}</h3>
                                <p className="text-xs text-indigo-600">{t('help.ai.desc')}</p>
                            </div>
                        </div>
                        {/* Embedding the Chatbot Component */}
                        <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
                             <Chatbot />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 my-4"></div>
                    <h3 className="font-bold text-gray-700 mb-2 px-1">{t('help.doc.title')}</h3>

                    {/* Accordion Item 1 */}
                    <details className="group bg-white border border-gray-200 rounded-lg open:shadow-md transition-shadow">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-gray-50 text-indigo-700 gap-3">
                            <div className="flex items-center gap-2">
                                 <Plus className="text-indigo-500" size={20} />
                                 <span>{t('help.create.title')}</span>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="text-gray-600 text-sm p-4 border-t border-gray-100 bg-gray-50">
                            <ol className="list-decimal list-inside space-y-2">
                                <li><strong>{t('help.create.step1.title')}:</strong> {t('help.create.step1.desc')}</li>
                                <li><strong>{t('help.create.step2.title')}:</strong> {t('help.create.step2.desc')}</li>
                                <li><strong>{t('help.create.step3.title')}:</strong> {t('help.create.step3.desc')}</li>
                            </ol>
                        </div>
                    </details>

                    {/* Accordion Item 2 */}
                    <details className="group bg-white border border-gray-200 rounded-lg open:shadow-md transition-shadow">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-gray-50 text-indigo-700 gap-3">
                             <div className="flex items-center gap-2">
                                <FileSpreadsheet className="text-indigo-500" size={20} />
                                <span>{t('help.excel.title')}</span>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="text-gray-600 text-sm p-4 border-t border-gray-100 bg-gray-50">
                            <p className="mb-2">{t('help.excel.desc')}</p>
                        </div>
                    </details>

                     {/* Accordion Item 3 */}
                    <details className="group bg-white border border-gray-200 rounded-lg open:shadow-md transition-shadow">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-gray-50 text-indigo-700 gap-3">
                            <div className="flex items-center gap-2">
                                 <Download className="text-indigo-500" size={20} />
                                 <span>{t('help.import.title')}</span>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="text-gray-600 text-sm p-4 border-t border-gray-100 bg-gray-50">
                            <ol className="list-decimal list-inside space-y-2">
                                <li>{t('help.import.step1')}</li>
                                <li>{t('help.import.step2')}</li>
                                <li>{t('help.import.step3')}</li>
                            </ol>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
};
