import { el } from '../core/dom.js';

export const ButtonVariant = {
    PRIMARY: 'primary',     // Emerald/Green (Save, Create)
    DANGER: 'danger',       // Red (Delete, Reset)
    SECONDARY: 'secondary', // Gray (Cancel, Close)
    GHOST: 'ghost',         // Text only buttons
    ICON: 'icon'            // Icon buttons (Close X)
};

const styles = {
    // Common base classes for standard buttons
    base: 'px-4 py-2 rounded-lg font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center justify-center',
    
    // Variants
    [ButtonVariant.PRIMARY]: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none focus:ring-emerald-500',
    [ButtonVariant.DANGER]: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    [ButtonVariant.SECONDARY]: 'bg-gray-300 hover:bg-gray-400 text-gray-800 focus:ring-gray-400',
    [ButtonVariant.GHOST]: 'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900',
    
    // Icon button (usually specific dimensions, handled by caller or base classes)
    [ButtonVariant.ICON]: 'text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100' 
};

/**
 * Creates a reusable Button component.
 * 
 * @param {Object} props
 * @param {string} [props.variant='secondary'] - One of ButtonVariant
 * @param {string} [props.label] - Button text
 * @param {Function|string} [props.onClick] - Click handler or string for legacy inline handlers
 * @param {string} [props.type='button'] - Button type
 * @param {string} [props.className] - Additional classes to merge
 * @param {string} [props.i18n] - data-i18n key
 * @param {string|Node} [props.icon] - SVG string or Node to display before text
 * @returns {HTMLButtonElement}
 */
export function Button({ 
    variant = ButtonVariant.SECONDARY, 
    label = '', 
    onClick, 
    type = 'button', 
    className = '', 
    i18n,
    icon,
    ...props 
} = {}) {
    
    const variantClass = styles[variant] || styles[ButtonVariant.SECONDARY];
    const combinedClass = `${variant === ButtonVariant.ICON ? '' : styles.base} ${variantClass} ${className}`.trim();

    const elementProps = {
        type,
        class: combinedClass,
        ...props
    };

    if (onClick) {
        if (typeof onClick === 'function') {
            elementProps.onclick = onClick; // Will be handled by el helper as listener
        } else {
            elementProps.onclick = onClick; // String assumed for legacy attribute
        }
    }

    if (i18n) {
        elementProps['data-i18n'] = i18n;
    }

    const children = [];
    
    // Icon Handling
    if (icon) {
        let iconNode;
        if (typeof icon === 'string' && icon.trim().startsWith('<svg')) {
             // Wrap SVG string in a span or plain html if complex
             // Using innerHTML via el helper
             iconNode = el('span', { 
                 class: label ? 'mr-2 flex items-center' : 'flex items-center',
                 innerHTML: icon 
             });
        } else if (icon instanceof Node) {
             iconNode = icon;
        }

        if (iconNode) children.push(iconNode);
    }
    
    if (label) {
        children.push(el('span', {}, label));
    }

    return el('button', elementProps, ...children);
}
