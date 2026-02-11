// Initialize Modals
import { 
    buildResetConfirmationModal,
    buildClearAppDataModal,
    buildDeleteCommentModal,
    buildDeleteItemModal,
    buildDropRoomModal
} from './modal-factory.js';

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    
    // Append dynamically built modals
    // Note: We are appending them, they are hidden by default
    body.appendChild(buildResetConfirmationModal());
    body.appendChild(buildClearAppDataModal());
    body.appendChild(buildDeleteCommentModal());
    body.appendChild(buildDeleteItemModal());
    body.appendChild(buildDropRoomModal());
    
    console.log('Dynamic Modals Initialized');
});
