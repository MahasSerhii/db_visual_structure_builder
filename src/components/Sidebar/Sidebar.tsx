import React, { useState } from 'react';
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CreateTab } from './tabs/CreateTab';
import { ConnectTab } from './tabs/ConnectTab';
import { DataTab } from './tabs/DataTab';
import { SettingsTab } from './tabs/SettingsTab';
import { Chatbot } from '../Chatbot/Chatbot';
import { PenTool, Link, Database, Settings, ChevronRight, Bot } from 'lucide-react'; 
import { useGraph } from '../../context/GraphContext';

interface NavBtnProps {
    to: string;
    icon: React.ElementType;
    label: string;
}

const NavBtn: React.FC<NavBtnProps> = ({ to, icon: Icon, label }) => (
    <NavLink 
        to={to} 
        onContextMenu={(e) => {
            e.preventDefault();
            window.open(window.location.origin + to, '_blank');
        }}
        className={({ isActive }) => `p-2 rounded-xl transition relative group ${isActive ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-700'}`}
        title={label}
    >
        <Icon size={20} />
        <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            {label}
        </span>
    </NavLink>
);

export const Sidebar: React.FC = () => {
    const { t } = useGraph();
    const [isOpen, setIsOpen] = useState(true);
    const location = useLocation();

    const toggleSidebar = () => setIsOpen(!isOpen);

    // Calculate if DataTab should be visible
    const isDataTabActive = location.pathname === '/data';

    return (
        <div id="sidebar" className={`bg-white flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200 shadow-xl z-50 shrink-0 relative h-screen dark:bg-slate-800 dark:border-slate-700 ${isOpen ? 'w-80' : 'w-0'}`}>
             
             {/* Toggle Button */}
             <button onClick={toggleSidebar} className="absolute -right-5 top-1/2 -translate-y-1/2 bg-white border-y border-r border-gray-200 text-gray-400 hover:text-indigo-600 rounded-r-xl w-5 h-16 shadow-md z-50 flex items-center justify-center outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 dark:hover:text-indigo-400">
                 <ChevronRight size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
             </button>

             {/* Inner Content Container - hidden when closed to prevent overflow */}
             <div className={`flex flex-col h-full w-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <div id="sidebar-nav" className="flex justify-around items-center p-3 border-b border-gray-100 bg-white gap-2 z-10 shrink-0 dark:bg-slate-800 dark:border-slate-700">
                     <NavBtn to="/create" icon={PenTool} label={t('sidebar.tab.create')} />
                     <NavBtn to="/connect" icon={Link} label={t('sidebar.tab.connect')} />
                     <NavBtn to="/data" icon={Database} label={t('sidebar.tab.data')} />
                     <NavBtn to="/ai" icon={Bot} label={t('sidebar.tab.ai')} />
                     <NavBtn to="/settings" icon={Settings} label={t('sidebar.tab.settings')} />
                 </div>

                 <div id="sidebar-content" className="flex-grow overflow-y-auto w-full p-0 relative custom-scrollbar">
                     <div className={`p-6 ${isDataTabActive ? 'block' : 'hidden'}`}>
                         <DataTab />
                     </div>
                     
                     <Routes>
                        <Route path="/" element={<Navigate to="/create" replace />} />
                        <Route path="/create" element={<div className="p-6"><CreateTab /></div>} />
                        <Route path="/connect" element={<div className="p-6"><ConnectTab /></div>} />
                        <Route path="/data" element={null} />
                        <Route path="/settings" element={<div className="p-6"><SettingsTab /></div>} />
                        <Route path="/ai" element={<Chatbot />} />
                     </Routes>
                 </div>
                 
                 <div className="p-4 border-t border-gray-100 text-[10px] text-center text-gray-400 bg-gray-50">
                     {t('sidebar.copyright')}
                 </div>
             </div>
        </div>
    );
};
