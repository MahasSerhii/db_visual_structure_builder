import React from 'react';
import './LoadingKitty.css';

interface LoadingKittyProps {
    size?: number;
    color?: string; // Color for the line
}

export const LoadingKitty = ({ size = 64, color = '#6366F1' }) => {
    return (
        <div className="loading-kitty-container" style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="kitty-svg">
                
                {/* Rolling Yarn Ball */}
                <g className="thread-ball">
                    <circle cx="82" cy="78" r="10" />
                    <path d="M 78 72 Q 82 78 88 74" opacity="0.6" />
                    <path d="M 76 80 Q 82 76 86 82" opacity="0.6" />
                    {/* Loose string */}
                    <path d="M 72 70 Q 60 55 65 40" strokeDasharray="3 3" strokeWidth="1" opacity="0.5" /> 
                </g>

                {/* Cute Head */}
                <g className="kitty-head">
                     {/* Round Head Shape */}
                    <path d="M 35 65 C 20 65 15 45 25 35 C 35 20 65 20 75 35 C 82 45 75 62 65 65" />
                    
                     {/* Ears (Perky) */}
                    <path d="M 28 35 L 22 22 L 38 28" />
                    <path d="M 62 28 L 78 22 L 72 35" />

                    {/* Kawaii Face */}
                    {/* Eyes ( ^ ^ ) */}
                    <path d="M 38 48 Q 42 45 46 48" strokeWidth="3" />
                    <path d="M 54 48 Q 58 45 62 48" strokeWidth="3" />
                    
                    {/* Nose & Mouth */}
                    <path d="M 48 54 L 50 56 L 52 54" strokeWidth="2" />
                    
                    {/* Whiskers */}
                    <path d="M 28 50 L 18 48" strokeWidth="1.5" />
                    <path d="M 28 54 L 18 56" strokeWidth="1.5" />
                    <path d="M 72 50 L 82 48" strokeWidth="1.5" />
                    <path d="M 72 54 L 82 56" strokeWidth="1.5" />
                </g>

                {/* Body Bouncing */}
                <g className="kitty-body-group">
                    {/* Paws & Base */}
                    <path d="M 40 65 L 40 75 Q 50 80 60 75 L 60 65" />
                    
                     {/* Animated Paw (Swiping at ball) */}
                     <g className="kitty-paw-group">
                        <path d="M 62 68 Q 70 65 74 72" strokeWidth="3.5" />
                     </g>
                </g>

            </svg>
        </div>
    );
};
