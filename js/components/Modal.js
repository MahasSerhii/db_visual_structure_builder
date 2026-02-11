import { el } from '../core/dom.js';

/**
 * Creates a standard Modal structure.
 * 
 * @param {Object} props
 * @param {string} props.id - The DOM ID for the modal container.
 * @param {string} [props.title] - The title text.
 * @param {string} [props.titleI18n] - The data-i18n key for the title.
 * @param {string} [props.titleColor='text-indigo-600'] - Title color class.
 * @param {string|Function} [props.onClose] - Name of global close function (string) or callback.
 * @param {HTMLElement|HTMLElement[]} props.content - Body content.
 * @param {HTMLElement|HTMLElement[]} [props.footer] - Footer content (buttons).
 * @param {string} [props.maxWidth='max-w-lg'] - Width class (max-w-md, max-w-lg, max-w-2xl, etc).
 * @returns {HTMLElement} The complete modal DOM element.
 */
export function Modal({
    id,
    title,
    titleI18n,
    titleColor = 'text-indigo-600',
    onClose,
    onCloseArg,
    content,
    footer,
    maxWidth = 'max-w-lg'
} = {}) {

    // Close Button Handling
    const closeBtnProps = {
        class: 'absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-2xl z-20',
        innerHTML: '&times;'
    };

    if (typeof onClose === 'string') {
        const arg = onCloseArg || id;
        closeBtnProps.onclick = `${onClose}('${arg}')`;
    } else if (typeof onClose === 'function') {
        closeBtnProps.onclick = onClose;
    }

    // Header
    const headerTitle = el('h2', { 
        class: `text-2xl font-bold ${titleColor}`,
        'data-i18n': titleI18n 
    }, title);

    const header = el('div', {
        class: 'p-6 border-b border-gray-100 flex-shrink-0 bg-white relative z-10'
    },
        el('button', closeBtnProps),
        headerTitle
    );

    // Body
    const body = el('div', {
        class: 'p-6 overflow-y-auto flex-grow bg-gray-50/50 custom-scrollbar'
    }, content);

    // Container
    const containerClasses = `bg-white rounded-2xl border border-gray-200 w-full ${maxWidth} shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]`;
    const container = el('div', { class: containerClasses }, header, body);

    // Footer (Optional)
    if (footer) {
        const footerEl = el('div', {
            class: 'p-6 border-t border-gray-100 bg-white flex justify-between flex-shrink-0'
        }, footer);
        container.appendChild(footerEl);
    }

    // Overlay Wrapper
    const wrapper = el('div', {
        id: id,
        class: 'hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center'
    }, container);

    return wrapper;
}
