export const en: Record<string, string> = {
    // History Controller
    "error.history.context_missing": "Authentication context missing.",
    "error.history.not_found": "History item not found or does not belong to this project.",
    "error.history.revert_failed_state": "Cannot revert this item (missing previous state).",
    "error.history.revert_failed": "Failed to revert history item.",
    "error.history.fetch_failed": "Failed to fetch history.",
    "error.history.clear_failed": "Failed to clear history.",

    // Graph Controller
    "error.graph.project_not_loaded": "Project not loaded.",
    "error.graph.node_not_found": "Node not found.",
    "error.graph.edge_not_found": "Edge not found.",
    "error.graph.add_node_failed": "Failed to add node.",
    "error.graph.update_node_failed": "Failed to update node.",
    "error.graph.delete_node_failed": "Failed to delete node.",
    "error.graph.add_edge_failed": "Failed to add edge.",
    "error.graph.update_edge_failed": "Failed to update edge.",
    "error.graph.delete_edge_failed": "Failed to delete edge.",
    "error.graph.sync_failed": "Failed to sync graph data.",
    "error.graph.comment_not_found": "Comment not found.",
    "error.graph.room_required": "Room ID is required.",

    // Auth Controller
    "error.auth.email_exists": "Email is already registered.",
    "error.auth.user_not_found": "User not found.",
    "error.auth.wrong_password": "Incorrect password.",
    "error.auth.forbidden": "Access Denied / Forbidden.",
    "error.auth.login_failed": "Login failed.",
    "error.auth.register_failed": "Registration failed.",
    "error.auth.invalid_token": "Invalid or expired token.",
    "error.auth.no_token": "No token provided.",
    
    // Project Controller
    "error.project.create_failed": "Failed to create project.",
    "error.project.not_found": "Project not found."
};
