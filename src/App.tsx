import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { GraphCanvas } from './components/Canvas/GraphCanvas';
import { GraphProvider, useGraph } from './context/GraphContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { EditNodeModal } from './components/Modals/EditNodeModal';
import { WelcomeModal } from './components/Modals/WelcomeModal';
import { Chatbot } from './components/Chatbot/Chatbot';
import { LoadingKitty } from './components/UI/LoadingKitty'; 
import { CommentsListModal } from './components/Modals/CommentsListModal'; 
import { ComponentsListModal } from './components/Modals/ComponentsListModal';
import { CreateNodeModal } from './components/Modals/CreateNodeModal';
import { NodeData } from './utils/types';
import { 
    Plus, MessageSquare, List, Lock, Unlock, Moon, Sun, 
    Share2, User as UserIcon, X, MessageSquareText, Bell 
} from 'lucide-react'; 
import './styles/index.css';

const MainLayout: React.FC = () => {
    const { updateNode, deleteNode, nodes, addNode, comments, config, updateConfig, t } = useGraph(); 
    const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    
    // UI States
    const [isLocked, setIsLocked] = useState(false);
    const isDark = config.theme === 'dark';
    const [showComponentsList, setShowComponentsList] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false); // AI Chat
    const [showCommentsList, setShowCommentsList] = useState(false); // Project Comments
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    
    // Global Lock Loading State
    const [isLocking, setIsLocking] = useState(false);

    // Notifications Logic
    const unreadCount = React.useMemo(() => {
        // Count comments not by me
        return comments.filter(c => c.author.name !== config.userProfile.name && !c.isResolved).length;
    }, [comments, config.userProfile.name]);

    React.useEffect(() => {
        const hasName = localStorage.getItem('my_user_name');
        if (!hasName) setShowWelcomeModal(true);
    }, []);

    const handleGlobalLock = async () => {
        if (isLocking) return;
        setIsLocking(true);
        const newState = !isLocked;
        setIsLocked(newState);
        
        // Lock/Unlock all nodes
        const updatedNodes = nodes.map(n => ({ ...n, locked: newState }));
        
        // Use Promise.all to parallelize if updateNode is async but handled by backend or local storage
        // If it's pure local state, this is fast. If it simulates network, we need to wait.
        // We'll emulate a small delay if needed or just process
        
        await Promise.all(updatedNodes.map(node => updateNode(node)));
        setIsLocking(false);
    };

    const handleNodeClick = (node: NodeData) => {
        if (node.locked) return; // Use data property
        setSelectedNode(node);
        setEditModalOpen(true);
    };

    const handleSaveNode = async (updatedNode: NodeData) => {
        await updateNode(updatedNode);
    };

    const handleDeleteNode = async (id: string) => {
        await deleteNode(id);
    };

    const handleDataImport = () => {
        setShowCreateModal(true);
    };

    return (
        <div className={`flex bg-gray-50 dark:bg-gray-900 min-h-screen overflow-hidden`}>
            {/* Left Sidebar */}
            <Sidebar />

            <div id="app" className="flex-grow flex flex-col p-4 h-screen relative transition-colors duration-300">
                
                {/* Top Header */}
                <div className="flex justify-between items-center mb-4 gap-4 shrink-0 h-12 bg-white dark:bg-slate-800 rounded-xl px-4 shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">{t('app.v')}</span>
                        <input 
                            className="font-bold text-gray-800 dark:text-gray-100 outline-none hover:bg-gray-50 dark:hover:bg-slate-700 focus:bg-gray-100 dark:focus:bg-slate-600 px-2 py-1 rounded bg-transparent" 
                            defaultValue={t('app.title')} 
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={handleGlobalLock} 
                            className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                            title={isLocked ? t('btn.unlock') : t('btn.lock')}
                         >
                             {isLocked ? <Lock size={18} strokeWidth={2.5} /> : <Unlock size={18} />}
                         </button>
                         
                         <button 
                             onClick={() => setShowCommentsList(!showCommentsList)}
                             className={`p-2 rounded-lg transition-colors ${showCommentsList ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                             title={t('btn.comments')}
                         >
                             <MessageSquareText size={18} />
                         </button>

                         <button 
                             onClick={() => updateConfig({...config, theme: isDark ? 'light' : 'dark'})}
                             className="p-2 text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                             title={isDark ? t('btn.mode.light') : t('btn.mode.dark')}
                         >
                             {isDark ? <Sun size={18} /> : <Moon size={18} />}
                         </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                         <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors">
                             <Share2 size={14} /> {t('btn.share')}
                         </button>
                         
                         <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white cursor-pointer">
                             <UserIcon size={14} />
                         </div>
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div id="diagram-container" className="flex-grow bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-inner border border-gray-200 dark:border-slate-800 relative overflow-hidden">
                    {/* Loading Overlay */}
                    {isLocking && (
                        <div className="absolute inset-0 z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                            <div className="flex flex-col items-center gap-4 bg-white/80 dark:bg-slate-800/80 p-6 rounded-2xl shadow-xl border border-indigo-50 dark:border-indigo-900">
                                <LoadingKitty size={80} color="#6366F1" />
                                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse">{t('loading.permissions')}</span>
                            </div>
                        </div>
                    )}
                    <GraphCanvas onNodeClick={handleNodeClick} isCommentMode={showCommentsList} />
                    
                    {/* Floating Action Buttons (Right Side) */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button 
                            onClick={handleDataImport}
                            className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-all text-gray-600 dark:text-gray-300" 
                            title={t('btn.create')}
                        >
                            <Plus size={20} />
                        </button>
                        <button 
                            onClick={() => setShowComponentsList(!showComponentsList)}
                            className={`bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 hover:scale-105 transition-all ${showComponentsList ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
                            title={t('btn.list')}
                        >
                            <List size={20} />
                        </button>
                        <button 
                            onClick={() => setShowCommentsList(!showCommentsList)}
                            className={`bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 hover:scale-105 transition-all relative ${showCommentsList ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
                            title={t('btn.comments')}
                        >
                            <MessageSquareText size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Bottom Right Tools */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                         <button 
                            onClick={() => setShowChatModal(true)}
                            className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center"
                         >
                             <MessageSquare size={20} />
                         </button>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {selectedNode && (
                <EditNodeModal 
                    node={selectedNode}
                    isOpen={isEditModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onSave={handleSaveNode}
                    onDelete={handleDeleteNode}
                />
            )}
            
            {/* Draggable Comments List */}
            {showCommentsList && (
                <CommentsListModal onClose={() => setShowCommentsList(false)} />
            )}

            {/* Components List Modal */}
            {showComponentsList && (
                <ComponentsListModal 
                    onClose={() => setShowComponentsList(false)} 
                    onNodeSelect={(n) => {
                         setSelectedNode(n);
                         setEditModalOpen(true);
                    }}
                />
            )}

            {/* Chatbot Modal */}
            {showChatModal && (
                <div className="fixed bottom-20 right-4 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden z-50 flex flex-col animate-scale-in">
                    <div className="bg-indigo-600 p-3 text-white flex justify-between items-center">
                        <span className="font-bold text-sm">AI Assistant</span>
                        <button onClick={() => setShowChatModal(false)}><X size={16} /></button>
                    </div>
                    <div className="flex-grow overflow-hidden relative">
                         <Chatbot />
                    </div>
                </div>
            )}

            {/* Welcome Modal */}
            <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />

            {/* Create Node Modal */}
            {showCreateModal && (
                <CreateNodeModal onClose={() => setShowCreateModal(false)} />
            )}
        </div>
    );
};

function App() {
  return (
    <ToastProvider>
        <GraphProvider>
            <MainLayout />
        </GraphProvider>
    </ToastProvider>
  );
}

export default App;
