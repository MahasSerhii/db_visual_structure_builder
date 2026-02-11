/**
 * Helper to create DOM elements with attributes and children.
 * @param {string} tag - HTML tag name (e.g., 'div', 'button').
 * @param {Object} props - Attributes and properties (e.g., { class: 'btn', onclick: fn }).
 * @param {...(string|Node)} children - Child nodes or text strings.
 * @returns {HTMLElement} The created DOM element.
 */
export function el(tag, props = {}, ...children) {
    const element = document.createElement(tag);

    if (props) {
        for (const [key, value] of Object.entries(props)) {
            if (value === undefined || value === null) continue;

            if (key === 'className' || key === 'class') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.substring(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else if (key === 'dataset') {
                for (const [dataKey, dataValue] of Object.entries(value)) {
                    element.dataset[dataKey] = dataValue;
                }
            } else {
                element.setAttribute(key, value);
            }
        }
    }

    children.forEach(child => {
        if (child === null || child === undefined) return;
        if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        } else if (Array.isArray(child)) {
            child.forEach(c => {
                 if(c) element.appendChild(c);
            });
        }
    });

    return element;
}
