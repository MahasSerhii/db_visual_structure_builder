import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSend = () => {
        alert(`Message sent!\nEmail: ${email}\nMessage: ${message}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative">
                <div className="p-6 border-b border-gray-100 flex-shrink-0 bg-white relative z-10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-indigo-600">Contact Us</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl z-20">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 bg-gray-50/50">
                     <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:border-indigo-500 transition outline-none" 
                            placeholder="your@email.com" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Message</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm h-32 focus:border-indigo-500 transition outline-none" 
                            placeholder="How can we help?"
                        ></textarea>
                     </div>
                     <button onClick={handleSend} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-lg transition transform hover:scale-[1.01]">
                        Send Message
                     </button>
                </div>
            </div>
        </div>
    );
};
