import React, { useState, useEffect } from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { GraphCanvas } from '../Canvas/GraphCanvas';
import { useGraph } from '../../context/GraphContext';
import { useWorkspace } from '../../context/WorkspaceContext'; // Added
import { useToast } from '../../context/ToastContext';
import { EditNodeModal } from '../Modals/EditNodeModal';
import { WelcomeModal } from '../Modals/WelcomeModal';
import { AuthModal } from '../Modals/AuthModal'; 
import { LoadingKitty } from '../UI/LoadingKitty'; 
import { CommentsListModal } from '../Modals/CommentsListModal'; 
import { ComponentsListModal } from '../Modals/ComponentsListModal';
import { CreateNodeModal } from '../Modals/CreateNodeModal';
import { ToDoListModal } from '../Modals/ToDoListModal'; 
import { NodeData } from '../../utils/types';
import { 
    Plus, MessageSquare, List, Lock, Unlock, Moon, Sun, 
    Share2, User as UserIcon, X, MessageSquareText, CheckSquare 
} from 'lucide-react'; 
import '../../styles/index.css';
import { Chatbot } from '../Chatbot/Chatbot';

// Allow receiving tabId to identify this session in the workspace
export const ProjectSession: React.FC<{ tabId?: string }> = ({ tabId }) => {
    const { 
        updateNode, deleteNode, nodes, comments, config, updateConfig, userProfile,
        t, isAuthenticated, login, isLoading, connectionStatus, retryConnection, 
        isLiveMode, setLiveMode, isTransitioningToLive, currentRoomId, savedProjects
    } = useGraph(); 
    
    // Sync Room ID and Title to Workspace Tab
    const { updateTab } = useWorkspace();
    
    useEffect(() => {
        if (tabId && currentRoomId) {
             // Find project name if possible
             const project = savedProjects.find(p => p.id === currentRoomId);
             
             let title = `Room ${currentRoomId.slice(0,6)}`;
             if (project) {
                 // Remove "Project" prefix if present (case insensitive)
                 title = project.name.replace(/^Project\s+/i, '');
             }
             
             updateTab(tabId, { 
                 roomId: currentRoomId,
                 title: title
             });
        }
    }, [tabId, currentRoomId, updateTab, savedProjects]);

     const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    
    // Initial Invite Handling (Initialized from URL to avoid effect sync)
    // NOTE: URL params are global. In a multi-tab setup, reading URL params inside
    // every tab might be redundant, but acceptable.
    const [inviteToken, setInviteToken] = useState<string | undefined>(() => 
        new URLSearchParams(window.location.search).get('token') || undefined
    );
    const [resetToken, setResetToken] = useState<string | undefined>(() => 
        new URLSearchParams(window.location.search).get('reset_token') || undefined
    );

    const [isAuthModalOpen, setAuthModalOpen] = useState(() => {
        // Initialize modal state based on tokens to avoid useEffect
        if (typeof window !== 'undefined') {
             const params = new URLSearchParams(window.location.search);
             if (params.get('reset_token')) return true;
             // Check auth roughly to decide default state (GraphContext is source of truth but this is just init)
             const hasAuth = !!localStorage.getItem('auth_token'); 
             if (params.get('token') && !hasAuth) return true;
        }
        return false;
    });

    const { showToast } = useToast();
    
    // UI States
    const [isLocked, setIsLocked] = useState(false);
    const isDark = config.theme === 'dark';
    const [showComponentsList, setShowComponentsList] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false); // AI Chat
    const [showCommentsList, setShowCommentsList] = useState(false); // Project Comments
    const [showToDoList, setShowToDoList] = useState(false); // ToDo List
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    
    // Global Lock Loading State
    const [isLocking, setIsLocking] = useState(false);

    // Notifications Logic
    const unreadCount = React.useMemo(() => {
        // Count comments not by me
        return (comments || []).filter(c => c.author.name !== userProfile.name && !c.isResolved).length;
    }, [comments, userProfile.name]);

    React.useEffect(() => {
        if (!isAuthenticated) {
            // We do NOT strictly enforce open modal on reload unless it's a fresh visit or invite
            setAuthModalOpen(false);
            
            // Show welcome modal for non-authenticated users (首次访问 - First Visit)
            const hasSeenWelcome = localStorage.getItem('has_seen_welcome');
            if (!hasSeenWelcome) {
                setShowWelcomeModal(true);
            }
        }
    }, [isAuthenticated]); // Check when auth state changes or on mount

    const renderLoader = () => {
         // Only show loader if we are in Live Mode and actively connecting/loading OR transitioning
         if ((isLiveMode || isTransitioningToLive) && (isLoading || connectionStatus === 'connecting' || connectionStatus === 'reconnecting' || isTransitioningToLive)) {
            const message = connectionStatus === 'reconnecting' 
                ? "Connection lost, attempting to reconnect..." 
                : "Connecting to Live Server...";

            return (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[50]">
                    <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900">
                        <LoadingKitty size={80} color="#6366F1" />
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-xs animate-pulse">{message}</span>
                    </div>
                </div>
            );
         }
         
         if (isLiveMode && connectionStatus === 'failed') {
            return (
                <div className="absolute inset-0 bg-white dark:bg-slate-950 flex items-center justify-center z-[50]">
                    <div className="flex flex-col items-center gap-6 max-w-md text-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-red-100 dark:border-red-900/30">
                        <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-4 rounded-full">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Connection Failed</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                We couldn't connect to the server. You can keep working locally or try again.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full">
                             <button 
                                onClick={() => retryConnection()}
                                className="w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                                Retry Connection
                            </button>
                            <button 
                                onClick={() => {
                                    setLiveMode(false);
                                }}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
                            >
                                Use App Locally
                            </button>
                        </div>
                    </div>
                </div>
            );
         }
         return null;
    };

    const checkAuth = (actionName: string) => {
        if (!isAuthenticated) {
            showToast(`Please log in to use ${actionName}`, 'warning');
            setAuthModalOpen(true);
            return false;
        }
        return true;
    };

    const handleGlobalLock = async () => {
        if (!checkAuth("Live Mode")) return;
        if (isLocking) return;
        setIsLocking(true);
        const newState = !isLocked;
        setIsLocked(newState);
        const updatedNodes = nodes.map(n => ({ ...n, locked: newState }));
        await Promise.all(updatedNodes.map(node => updateNode(node)));
        setIsLocking(false);
    };

    const handleDataImport = () => {
        setShowCreateModal(true);
    };

    return (
        <div className={`flex w-full h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
             
             {/* Sidebar */}
             <Sidebar tabId={tabId} />

             <div className="flex-grow flex flex-col p-2 h-full relative overflow-hidden">
                {/* Top Header restored from original App.tsx */}
                <div className="flex justify-between items-center mb-2 gap-4 shrink-0 h-12 bg-white dark:bg-slate-800 rounded-xl px-4 shadow-sm border border-gray-200 dark:border-slate-700 z-10">
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">{t('app.v')}</span>
                        <span className="font-bold text-gray-800 dark:text-gray-100 px-2 py-1">
                             {t('app.title')}
                        </span>
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
                             onClick={() => checkAuth("Comments") && setShowCommentsList(!showCommentsList)}
                             className={`p-2 rounded-lg transition-colors ${showCommentsList ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                             title={t('btn.comments')}
                         >
                             <MessageSquareText size={18} />
                         </button>

                        <button
                            onClick={()=>setShowToDoList(true)}
                             className={`p-2 rounded-lg transition-colors text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700`}
                             title="To-Do List"
                         >
                             <CheckSquare size={18} />
                         </button>

                         <button 
                             onClick={() => updateConfig({...config, theme: isDark ? 'light' : 'dark'})}
                             className="p-2 text-gray-400 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                             title={isDark ? t('btn.mode.light') : t('btn.mode.dark')}
                         >
                             {isDark ? <Sun size={18} /> : <Moon size={18} />}
                         </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                         <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors"
                            onClick={() => checkAuth("Sharing") && showToast("Sharing feature coming soon!", "info")}
                         >
                             <Share2 size={14} /> {t('btn.share')}
                         </button>
                         
                         <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white cursor-pointer relative group">
                             <UserIcon size={14} />
                             {userProfile.name && (
                                 <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                     {userProfile.name}
                                 </div>
                             )}
                         </div>
                    </div>
                </div>

                {/* Main Canvas Container with Rounded corners like original */}
                <div id="diagram-container" className="flex-grow bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-inner border border-gray-200 dark:border-slate-800 relative overflow-hidden">
                    
                    {renderLoader()}

                    <GraphCanvas 
                        onNodeClick={(node) => {
                            if (node.locked) return;
                            setSelectedNode(node);
                            setEditModalOpen(true);
                        }}
                        isCommentMode={showCommentsList}
                    />

                    {/* Floating Action Buttons (Restored Right Side Stack) */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
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
                            onClick={() => checkAuth("Comments") && setShowCommentsList(!showCommentsList)}
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

                    {/* Bottom Right AI Button */}
                    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                         <button 
                            onClick={() => checkAuth("AI Chat") && setShowChatModal(true)}
                            className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center animate-pulse-subtle"
                         >
                             <MessageSquare size={20} />
                         </button>
                    </div>
                </div>
             </div>
             
             {/* Modals */}
             {selectedNode && (
                 <EditNodeModal 
                    isOpen={isEditModalOpen}
                    onClose={() => { setEditModalOpen(false); setSelectedNode(null); }}
                    node={selectedNode}
                    onSave={async (updated) => {
                        await updateNode(updated);
                        setEditModalOpen(false);
                    }}
                    onDelete={async (id) => {
                        await deleteNode(id);
                        setEditModalOpen(false);
                    }}
                 />
             )}
             
             {showComponentsList && <ComponentsListModal onClose={() => setShowComponentsList(false)} />}
             {showCommentsList && <CommentsListModal onClose={() => setShowCommentsList(false)} />}
            
            {/* Chatbot Modal */}
            {showChatModal && (
                <div className="fixed bottom-4 right-4 w-[400px] h-[600px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col z-[100] border border-gray-200 dark:border-slate-700 animate-slide-up">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-t-2xl">
                        <span className="font-bold text-sm">AI Assistant</span>
                        <button onClick={() => setShowChatModal(false)}><X size={16} /></button>
                    </div>
                    <div className="flex-grow overflow-hidden relative">
                         <Chatbot />
                    </div>
                </div>
            )}

            {/* Auth Modal */}
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setAuthModalOpen(false)} 
                initialState={resetToken ? 'RESET_PASSWORD' : (inviteToken ? 'REGISTER' : 'LOGIN')}
                inviteToken={inviteToken}
                resetToken={resetToken}
                onSuccess={(token, email, name, projects, userProfile) => {
                    login(token, email, name, 'email', projects, userProfile); 
                    setAuthModalOpen(false);
                    // Clear search params if needed, but keeping them might be useful for now
                    if (inviteToken || resetToken) {
                         const url = new URL(window.location.href);
                         url.searchParams.delete('token');
                         url.searchParams.delete('reset_token');
                         window.history.replaceState({}, document.title, url.toString());
                         setInviteToken(undefined);
                         setResetToken(undefined);
                    }
                }}
            />

            {/* Welcome Modal */}
            <WelcomeModal isOpen={showWelcomeModal} onClose={() => {
                setShowWelcomeModal(false);
                localStorage.setItem('has_seen_welcome', 'true');
            }} />

            {/* Create Node Modal */}
            {showCreateModal && (
                <CreateNodeModal onClose={() => setShowCreateModal(false)} />
            )}
            
            {showToDoList && <ToDoListModal isOpen={showToDoList} onClose={() => setShowToDoList(false)} />}
        </div>
    );
};
 
