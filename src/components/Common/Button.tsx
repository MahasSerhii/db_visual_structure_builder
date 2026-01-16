import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    icon, 
    className = '', 
    ...props 
}) => {
    const baseStyles = "flex items-center justify-center gap-2 font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 focus:ring-indigo-500 border border-transparent",
        secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 focus:ring-gray-200",
        danger: "bg-white text-red-600 hover:bg-red-50 border border-red-200 focus:ring-red-200",
        ghost: "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    return (
        <button 
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    );
};
