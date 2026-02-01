export const ua: Record<string, string> = {
    // History Controller
    "error.history.context_missing": "Відсутній контекст автентифікації.",
    "error.history.not_found": "Запис історії не знайдено або він не належить цьому проекту.",
    "error.history.revert_failed_state": "Неможливо повернути цей запис (відсутній попередній стан).",
    "error.history.revert_failed": "Не вдалося скасувати дію.",
    "error.history.fetch_failed": "Не вдалося отримати історію.",
    "error.history.clear_failed": "Не вдалося очистити історію.",

    // Graph Controller
    "error.graph.project_not_loaded": "Проект не завантажено.",
    "error.graph.node_not_found": "Вузол не знайдено.",
    "error.graph.edge_not_found": "Зв'язок не знайдено.",
    "error.graph.add_node_failed": "Не вдалося додати вузол.",
    "error.graph.update_node_failed": "Не вдалося оновити вузол.",
    "error.graph.delete_node_failed": "Не вдалося видалити вузол.",
    "error.graph.add_edge_failed": "Не вдалося додати зв'язок.",
    "error.graph.update_edge_failed": "Не вдалося оновити зв'язок.",
    "error.graph.delete_edge_failed": "Не вдалося видалити зв'язок.",
    "error.graph.sync_failed": "Не вдалося синхронізувати дані графа.",
    "error.graph.comment_not_found": "Коментар не знайдено.",
    "error.graph.room_required": "Ідентифікатор кімнати обов'язковий.",

    // Auth Controller
    "error.auth.email_exists": "Електронна пошта вже зареєстрована.",
    "error.auth.user_not_found": "Користувача не знайдено.",
    "error.auth.wrong_password": "Невірний пароль.",
    "error.auth.forbidden": "Доступ заборонено.",
    "error.auth.login_failed": "Помилка входу.",
    "error.auth.register_failed": "Помилка реєстрації.",
    "error.auth.invalid_token": "Невірний або прострочений токен.",
    "error.auth.no_token": "Токен не надано.",
    
    // Project Controller
    "error.project.create_failed": "Не вдалося створити проект.",
    "error.project.not_found": "Проект не знайдено."
};
