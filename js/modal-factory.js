import { Modal } from './components/Modal.js';
import { Button, ButtonVariant } from './components/Button.js';
import { el } from './core/dom.js';

export function buildResetConfirmationModal() {
    const content = el('div', {},
        el('p', { class: 'text-gray-700 mb-6' },
            el('span', { 'data-i18n': 'resetMsg' }, 'Are you absolutely sure you want to clear the entire dashboard?'),
            el('br'), el('br'),
            el('strong', { class: 'font-bold text-red-700', 'data-i18n': 'warning' }, 'Warning: '),
            el('span', { 'data-i18n': 'resetWarningBody' }, 'All local data will be lost unless you have exported a backup JSON file.')
        )
    );

    const btnCancel = Button({
        label: 'Cancel',
        i18n: 'cancel',
        onClick: "closeModal('reset')",
        variant: ButtonVariant.SECONDARY
    });

    const btnConfirm = Button({
        id: 'btn-reset-confirm',
        label: 'Yes, Clear Dashboard',
        i18n: 'yesReset',
        onClick: "resetDashboardConfirmed()",
        variant: ButtonVariant.DANGER
    });

    return Modal({
        id: 'reset-confirmation-modal',
        title: 'Confirm Dashboard Reset',
        titleI18n: 'confirmReset',
        titleColor: 'text-red-600',
        onClose: 'closeModal',
        onCloseArg: 'reset',
        content: content,
        footer: [btnCancel, btnConfirm],
        maxWidth: 'max-w-lg'
    });
}

export function buildClearAppDataModal() {
    const content = el('div', {},
        el('p', { class: 'text-gray-700 mb-6' },
            el('span', { 'data-i18n': 'clearDataDesc' }, 'This will delete all local data, including settings, cached graphs, and user preferences.'),
            el('br'), el('br'),
            el('strong', { class: 'font-bold text-red-700', 'data-i18n': 'warning' }, 'Warning: '),
            el('span', { 'data-i18n': 'clearDataWarning' }, 'This action cannot be undone.')
        )
    );

    const btnCancel = Button({
        label: 'Cancel',
        i18n: 'cancel',
        onClick: "closeModal('clearData')",
        variant: ButtonVariant.SECONDARY
    });

    const btnConfirm = Button({
        label: 'Yes, Clear Everything',
        i18n: 'yesClearData',
        onClick: "confirmClearAppData()",
        variant: ButtonVariant.DANGER
    });

    return Modal({
        id: 'clear-data-modal',
        title: 'Reset Application',
        titleI18n: 'resetAppTitle',
        titleColor: 'text-red-600',
        onClose: 'closeModal',
        onCloseArg: 'clearData',
        content: content,
        footer: [btnCancel, btnConfirm],
        maxWidth: 'max-w-lg'
    });
}

export function buildDeleteCommentModal() {
    const content = el('div', {},
        el('p', { class: 'text-gray-700 mb-6' },
            el('span', { 'data-i18n': 'deleteCommentDesc' }, 'Are you sure you want to delete this entire conversation thread?'),
            el('br'), el('br'),
            el('strong', { class: 'font-bold text-red-700', 'data-i18n': 'warning' }, 'Warning: '),
            el('span', { 'data-i18n': 'clearDataWarning' }, 'This action cannot be undone.')
        )
    );

    const btnCancel = Button({
        label: 'Cancel',
        i18n: 'cancel',
        onClick: "closeModal('deleteComment')",
        variant: ButtonVariant.SECONDARY
    });

    const btnConfirm = Button({
        label: 'Yes, Delete',
        i18n: 'yesDelete',
        onClick: "confirmDeleteComment()",
        variant: ButtonVariant.DANGER
    });

    return Modal({
        id: 'delete-comment-modal',
        title: 'Delete Conversation',
        titleI18n: 'deleteCommentTitle',
        titleColor: 'text-red-600',
        onClose: 'closeModal',
        onCloseArg: 'deleteComment',
        content: content,
        footer: [btnCancel, btnConfirm],
        maxWidth: 'max-w-lg'
    });
}

export function buildDeleteItemModal() {
    const content = el('div', {},
         el('p', { class: 'text-gray-700 mb-6' },
            el('span', { 'data-i18n': 'deleteCompConfirmDesc' }, 'This will delete the component and all connections.'),
            el('br'),
            el('strong', { id: 'delete-item-name', class: 'block mt-2 text-indigo-600 font-mono text-sm break-all' })
        )
    );

    const btnCancel = Button({
        label: 'Cancel',
        i18n: 'cancel',
        onClick: "closeModal('deleteItem')",
        variant: ButtonVariant.SECONDARY
    });

    const btnConfirm = Button({
        label: 'Delete',
        i18n: 'delete',
        onClick: "deleteFromListConfirmed()",
        variant: ButtonVariant.DANGER
    });

    return Modal({
        id: 'delete-item-modal',
        title: 'Delete Component?',
        titleI18n: 'deleteCompConfirmTitle',
        titleColor: 'text-gray-800',
        onClose: 'closeModal',
        onCloseArg: 'deleteItem',
        content: content,
        footer: [btnCancel, btnConfirm],
        maxWidth: 'max-w-lg'
    });
}

export function buildDropRoomModal() {
     const content = el('div', {},
         el('p', { class: 'text-gray-700 mb-6' },
            el('span', { 'data-i18n': 'dropRoomConfirm' }, 'Are you sure? This will delete all data in the room for all users.')
        )
    );

    const btnCancel = Button({
        label: 'Cancel',
        i18n: 'cancel',
        onClick: "closeModal('dropRoom')",
        variant: ButtonVariant.SECONDARY
    });

    const trashIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;

    const btnConfirm = Button({
        label: 'Delete',
        i18n: 'delete',
        icon: trashIcon,
        onClick: "confirmDropRoom()",
        variant: ButtonVariant.DANGER
    });

    return Modal({
        id: 'drop-room-modal',
        title: 'Drop Room Data?',
        titleI18n: 'dropRoomTitle',
        titleColor: 'text-red-600',
        onClose: 'closeModal',
        onCloseArg: 'dropRoom',
        content: content,
        footer: [btnCancel, btnConfirm],
        maxWidth: 'max-w-lg'
    });
}