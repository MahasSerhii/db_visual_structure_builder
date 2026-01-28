import React, { useState, useRef, useEffect } from 'react';
import { useGraph } from '../../context/GraphContext';
import { NodeData } from '../../utils/types';
import { Send, Bot, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { kmDatabase } from './db/general';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export const Chatbot: React.FC = () => {
    const { nodes, addNode, updateNode } = useGraph();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hello! I'm your offline assistant. Ask me to create tables (e.g. 'create table users') or add properties (e.g. 'add email string').", sender: 'bot', timestamp: new Date() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Chat context for multi-turn conversations
    const [chatCtx, setChatCtx] = useState<{
        lastNodeId: string | null;
        awaiting: { type: 'prop_type', propName: string, nodeId: string } | null;
    }>({ lastNodeId: null, awaiting: null });

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: uuidv4(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // Process directly
        const botResponse = await processUserIntent(inputValue);
        
        const botMsg: Message = {
            id: uuidv4(),
            text: botResponse,
            sender: 'bot',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
    };

    const processUserIntent = async (rawMsg: string): Promise<string> => {
        const lower = rawMsg.toLowerCase().trim();

        // 1. Check Awaiting Context (Multi-turn)
        if (chatCtx.awaiting && chatCtx.awaiting.type === 'prop_type') {
            const node = nodes.find(n => n.id === chatCtx.awaiting!.nodeId);
            if (node) {
                const type = lower.split(' ')[0] || "string";
                const newProps = [...(node.props || []), { name: chatCtx.awaiting.propName, type, color: '#444' }]; // Default color
                await updateNode({ ...node, props: newProps });
                
                const propName = chatCtx.awaiting.propName;
                setChatCtx({ lastNodeId: node.id, awaiting: null });
                return `Added property **${propName}** : *${type}* to ${node.title}.`;
            }
            setChatCtx(prev => ({ ...prev, awaiting: null }));
        }

        // 2. Knowledge Base
        for (const entry of kmDatabase) {
            if (entry.keywords.some(k => lower.includes(k))) {
                return entry.answer;
            }
        }

        // 3. Create Component Logic
        // Regex: "create [table/node/box] [name]"
        const createMatch = lower.match(/(?:create|add|make|new)\s+(?:new\s+)?(?:component|table|collection|node|box)\s+(?:named\s+|called\s+|with\s+name\s+|title\s+)?(.+)/i);
        if (createMatch) {
            let title = createMatch[1].trim().replace(/[.,;!?]$/, '');
            if (title.startsWith("name ")) title = title.substring(5).trim();
            
            const newNode: NodeData = {
                id: uuidv4(),
                title: title,
                description: "Created via Chat",
                color: '#6366F1', // Default config color
                x: Math.random() * 400,
                y: Math.random() * 400,
                props: [{ name: 'id', type: 'UUID', color: '#000' }],
                createdAt: new Date().toISOString()
            };
            
            await addNode(newNode);
            setChatCtx(prev => ({ ...prev, lastNodeId: newNode.id }));
            return `Created component **${newNode.title}**. \nWant to add a property? Type e.g. "email" or "name string".`;
        }

        // 4. Add Property Logic
        // "add [prop] [type]" or "add [prop]"
        if (chatCtx.lastNodeId) {
             let propName = '';
             let propType = '';

            // Simple heuristic to catch "add email string" or just "email string"
            const cleanMsg = lower.replace(/^add\s+/, '').replace(/^property\s+/, '');
            const parts = cleanMsg.split(/\s+|:/);
            
            if (parts.length > 0 && parts[0]) {
                propName = parts[0];
                propType = parts[1] || '';
            }

            if (propName) {
                const node = nodes.find(n => n.id === chatCtx.lastNodeId);
                if (node) {
                    if (!propType) {
                        setChatCtx(prev => ({ ...prev, awaiting: { type: 'prop_type', propName, nodeId: node.id } }));
                        return `Adding property **${propName}** to ${node.title}. What is the **type**? (e.g. string, int)`;
                    } else {
                        const newProps = [...(node.props || []), { name: propName, type: propType, color: '#444' }];
                        await updateNode({ ...node, props: newProps });
                        return `Added property **${propName}** : *${propType}* to ${node.title}.`;
                    }
                }
            }
        }

        return "I didn't quite catch that. Try 'create table users' or ask about SQL vs NoSQL.";
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 mb-2">
                 <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                     <Bot size={20} /> AI Assistant
                 </h3>
                 <p className="text-xs text-indigo-600 mt-1">Ask me to create tables or define fields.</p>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-gray-200' : 'bg-indigo-100'}`}>
                            {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`p-3 rounded-lg text-sm max-w-[85%] shadow-sm ${
                            msg.sender === 'user' ? 'bg-white border border-gray-200 rounded-tr-none' : 'bg-indigo-600 text-white rounded-tl-none'
                        }`}>
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-gray-200 bg-white">
                <div className="relative">
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type 'create table products'..."
                        className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <button 
                        onClick={handleSend}
                        className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
