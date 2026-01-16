import React from 'react';
import { X, ChevronDown, Plus, FileSpreadsheet, Download, Bot } from 'lucide-react';
import { Chatbot } from '../Chatbot/Chatbot';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl shadow-2xl h-[85vh] flex flex-col overflow-hidden relative">
                 <div className="bg-gray-100 p-6 flex justify-between items-center border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Help & Instructions</h2>
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
                                <h3 className="font-bold text-indigo-900 text-lg">AI Assistant</h3>
                                <p className="text-xs text-indigo-600">Ask me anything about this tool! (No API key required)</p>
                            </div>
                        </div>
                        {/* Embedding the Chatbot Component */}
                        <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
                             <Chatbot />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 my-4"></div>
                    <h3 className="font-bold text-gray-700 mb-2 px-1">Detailed Documentation</h3>

                    {/* Accordion Item 1 */}
                    <details className="group bg-white border border-gray-200 rounded-lg open:shadow-md transition-shadow">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-gray-50 text-indigo-700 gap-3">
                            <div className="flex items-center gap-2">
                                 <Plus className="text-indigo-500" size={20} />
                                 <span>How to Create a Graph</span>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="text-gray-600 text-sm p-4 border-t border-gray-100 bg-gray-50">
                            <ol className="list-decimal list-inside space-y-2">
                                <li><strong>Create Components:</strong> Use the sidebar form to add boxes.</li>
                                <li><strong>Add Properties:</strong> Components can have "properties".</li>
                                <li><strong>Connect:</strong> Drag property dots on the graph to connect them visually or use the connection tab.</li>
                            </ol>
                        </div>
                    </details>

                    {/* Accordion Item 2 */}
                    <details className="group bg-white border border-gray-200 rounded-lg open:shadow-md transition-shadow">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-gray-50 text-indigo-700 gap-3">
                             <div className="flex items-center gap-2">
                                <FileSpreadsheet className="text-indigo-500" size={20} />
                                <span>How to Export/Edit in Excel</span>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="text-gray-600 text-sm p-4 border-t border-gray-100 bg-gray-50">
                            <p className="mb-2">Manage data in bulk with CSV export in the Data tab.</p>
                        </div>
                    </details>

                     {/* Accordion Item 3 */}
                    <details className="group bg-white border border-gray-200 rounded-lg open:shadow-md transition-shadow">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-gray-50 text-indigo-700 gap-3">
                            <div className="flex items-center gap-2">
                                 <Download className="text-indigo-500" size={20} />
                                 <span>How to Import CSV Data</span>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="text-gray-600 text-sm p-4 border-t border-gray-100 bg-gray-50">
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Click "Import / Export" in the Data tab.</li>
                                <li>Select your file.</li>
                                <li>Ensure columns match the database schema.</li>
                            </ol>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
};
