export const es: Record<string, string> = {
    // History Controller
    "error.history.context_missing": "Falta el contexto de autenticación.",
    "error.history.not_found": "Elemento del historial no encontrado o no pertenece a este proyecto.",
    "error.history.revert_failed_state": "No se puede revertir este elemento (no hay estado previo).",
    "error.history.revert_failed": "Error al revertir el elemento del historial.",
    "error.history.fetch_failed": "Error al obtener el historial.",
    "error.history.clear_failed": "Error al borrar el historial.",

    // Graph Controller
    "error.graph.project_not_loaded": "Proyecto no cargado.",
    "error.graph.node_not_found": "Nodo no encontrado.",
    "error.graph.edge_not_found": "Borde no encontrado.",
    "error.graph.add_node_failed": "Error al agregar el nodo.",
    "error.graph.update_node_failed": "Error al actualizar el nodo.",
    "error.graph.delete_node_failed": "Error al eliminar el nodo.",
    "error.graph.add_edge_failed": "Error al agregar el borde.",
    "error.graph.update_edge_failed": "Error al actualizar el borde.",
    "error.graph.delete_edge_failed": "Error al eliminar el borde.",
    "error.graph.sync_failed": "Error al sincronizar los datos del gráfico.",
    "error.graph.comment_not_found": "Comentario no encontrado.",
    "error.graph.room_required": "Se requiere ID de sala.",

    // Auth Controller
    "error.auth.email_exists": "El correo electrónico ya está registrado.",
    "error.auth.user_not_found": "Usuario no encontrado.",
    "error.auth.wrong_password": "Contraseña incorrecta.",
    "error.auth.forbidden": "Acceso denegado.",
    "error.auth.login_failed": "Error al iniciar sesión.",
    "error.auth.register_failed": "Error al registrarse.",
    "error.auth.invalid_token": "Token inválido o expirado.",
    "error.auth.no_token": "No se proporcionó token.",
    
    // Project Controller
    "error.project.create_failed": "Error al crear el proyecto.",
    "error.project.not_found": "Proyecto no encontrado."
};
