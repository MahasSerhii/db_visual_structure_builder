import { el } from '../core/dom.js';

export function Label({ text, i18n, className = '', ...props } = {}) {
    return el('label', {
        class: `block text-sm font-semibold text-gray-500 mb-1 ${className}`.trim(),
        'data-i18n': i18n,
        ...props
    }, text);
}

export function Input({ 
    label, 
    i18nLabel, 
    type = 'text', 
    value = '', 
    placeholder = '', 
    i18nPlaceholder, 
    className = '', 
    id,
    ...props 
} = {}) {
    const wrapper = el('div', { class: 'mb-4' });

    if (label || i18nLabel) {
        wrapper.appendChild(Label({ text: label, i18n: i18nLabel }));
    }

    const input = el('input', {
        type,
        id,
        value,
        placeholder,
        class: `w-full bg-white p-3 rounded-lg text-sm border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition ${className}`.trim(),
        'data-i18n-placeholder': i18nPlaceholder,
        ...props
    });

    wrapper.appendChild(input);
    return wrapper;
}

export function Textarea({ 
    label, 
    i18nLabel, 
    value = '', 
    placeholder = '', 
    i18nPlaceholder, 
    className = '', 
    heightClass = 'h-24',
    id,
    ...props 
} = {}) {
    const wrapper = el('div', { class: 'mb-4' });

    if (label || i18nLabel) {
        wrapper.appendChild(Label({ text: label, i18n: i18nLabel }));
    }

    const textarea = el('textarea', {
        id,
        class: `w-full bg-white p-3 rounded-lg text-sm border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition ${heightClass} ${className}`.trim(),
        placeholder,
        'data-i18n-placeholder': i18nPlaceholder,
        ...props
    }, value);

    wrapper.appendChild(textarea);
    return wrapper;
}
