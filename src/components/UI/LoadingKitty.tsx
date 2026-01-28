import React from 'react';
import './LoadingKitty.css';

interface LoadingKittyProps {
    size?: number;
    color?: string; // Color for the line
}

export const LoadingKitty = ({ size = 64, color = '#4A5568' }) => {
      const darkColor = '#2D3748';
    const ballColor = '#F6AD55';

    return (
        <div className="loading-kitty-container" style={{ width: size, height: size * 0.77 }}>
                <svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" className="cat-svg">
                    {/* Soft Shadow */}
                    <ellipse cx="105" cy="178" rx="85" ry="8" fill="#E2E8F0" />
                    
                    {/* Tail */}
                    <path className="tail" d="M155,145 C190,145 195,110 180,95" stroke={color} strokeWidth="12" fill="none" strokeLinecap="round" />
                    
                    {/* Body */}
                    <g>
                        <path d="M60,170 C55,170 45,160 50,140 C55,115 100,105 135,115 C160,125 165,160 155,170 C150,178 65,178 60,170 Z" fill={color} />
                        
                        {/* Back Stripes */}
                        <rect x="110" y="112" width="10" height="15" rx="5" fill={darkColor} transform="rotate(-5, 115, 112)" />
                        <rect x="125" y="115" width="10" height="14" rx="5" fill={darkColor} transform="rotate(5, 130, 115)" />
                        <rect x="140" y="122" width="10" height="12" rx="5" fill={darkColor} transform="rotate(15, 145, 122)" />
                    </g>
                    
                    {/* Thigh */}
                    <path d="M130,135 C150,135 155,170 135,170 C120,170 115,155 115,145 C115,135 125,135 130,135 Z" fill={darkColor} />

                    {/* Head Group */}
                    <g className="head">
                        {/* Ears */}
                        <path d="M55,75 Q45,45 75,65 Z" fill={color} stroke={color} strokeWidth="4" strokeLinejoin="round" />
                        <path d="M105,75 Q115,45 85,65 Z" fill={color} stroke={color} strokeWidth="4" strokeLinejoin="round" />
                        
                        {/* Head Circle */}
                        <circle cx="80" cy="95" r="36" fill={color} />
                        
                        {/* Expressive Eyes */}
                        <g className="eyes">
                            <circle cx="68" cy="92" r="6" fill="white" />
                            <g className="pupils">
                                 <circle cx="69" cy="93" r="3" fill="black" />
                                 <circle cx="67" cy="91" r="1.5" fill="white" opacity="0.8" />
                            </g>
                            <circle cx="92" cy="92" r="6" fill="white" />
                            <g className="pupils">
                                <circle cx="93" cy="93" r="3" fill="black" />
                                <circle cx="91" cy="91" r="1.5" fill="white" opacity="0.8" />
                            </g>
                        </g>
                        
                        {/* Nose */}
                        <path d="M77,102 Q80,100 83,102 Q80,105 77,102 Z" fill="#F687B3" />

                        {/* Mouth */}
                        <path d="M74,106 Q77,110 80,106 Q83,110 86,106" stroke={darkColor} strokeWidth="2" fill="none" strokeLinecap="round" />
                    </g>

                    {/* Paws */}
                    <rect x="72" y="160" width="16" height="12" rx="6" fill={darkColor} />
                    <rect x="90" y="158" width="16" height="12" rx="6" fill={color} />

                    {/* Yarn Ball */}
                    <g className="yarn-ball">
                        <circle cx="100" cy="165" r="14" fill={ballColor} />
                    </g>
                </svg>
            </div>
       
    );
};
