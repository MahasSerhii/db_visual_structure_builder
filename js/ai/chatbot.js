// AI Chatbot Logic

export const kmDatabase = [
    {
        keywords: ["sql", "mysql", "postgres", "relational"],
        answers: {
            en: "SQL (Relational) databases like MySQL and PostgreSQL store data in tables with strict schemas. \n\n**MySQL**: Great for web apps, read-heavy loads. \n**PostgreSQL**: Advanced, supports JSONB, complex queries, robust integrity. \n\n*Tip: Create 'Tables' and connect them to define Foreign Keys.*",
            de: "SQL-Datenbanken wie MySQL und PostgreSQL speichern Daten in Tabellen.",
            uk: "SQL (реляційні) бази даних, такі як MySQL та PostgreSQL, зберігають дані в таблицях зі строгою схемою. \n\n**MySQL**: Чудово підходить для веб-додатків. \n**PostgreSQL**: Підтримує JSONB, складні запити та надійну цілісність.",
        }
    },
    {
        keywords: ["nosql", "mongo", "mongodb", "document"],
        answers: {
            en: "NoSQL databases like MongoDB store data as flexible documents (JSON/BSON). \n\n**MongoDB**: Best for rapid prototyping, unstructured data, and scalability. Does not enforce strict joins like SQL. \n\n*Tip: Create 'Collections' and nesting properties.*",
            uk: "NoSQL бази даних, такі як MongoDB, зберігають дані як гнучкі документи (JSON/BSON). Ідеально для швидкої розробки та неструктурованих даних.",
        }
    },
    {
        keywords: ["json", "import"],
        answers: {
            en: "You can import properties from JSON! Open a component, expand 'Import Properties', paste your JSON, and click 'Detect Types'.",
            uk: "Ви можете імпортувати властивості з JSON! Відкрийте компонент, розгорніть 'Імпорт властивостей', вставте JSON та натисніть 'Визначити типи'.",
        }
    },
    {
        keywords: ["drop", "clear", "delete room", "reset"],
        answers: {
            en: "**Danger Zone**: To clear the room data, click the **Drop / Clear (💣)** button in the top toolbar (visible when connected). This removes ALL nodes and edges for everyone.",
            uk: "**Небезпечна зона**: Щоб очистити дані кімнати, натисніть кнопку **Скинути / Очистити (💣)** на верхній панелі (доступна при підключенні). Це видаляє ВСІ вузли та зв'язки для всіх учасників.",
        }
    },
    {
        keywords: ["comment", "thread", "reply", "edit", "chat", "talk", "message"],
        answers: {
            en: "**Collaboration**: \n- **Global Chat**: Use the chat bubble (bottom-right) to talk to everyone in the room. \n- **Node Comments**: Select a node and click the **Quote Icon** to discuss specific topics.",
            uk: "**Співпраця**: \n- **Глобальний чат**: Використовуйте іконку чату (внизу праворуч) для спілкування. \n- **Коментарі до вузлів**: Виберіть вузол і натисніть **іконку цитати**, щоб обговорити конкретні теми.",
        }
    },
    {
        keywords: ["magic link", "share", "invite"],
        answers: {
            en: "**Sharing**: Click the **Copy Link (🔗)** button to get a secure Magic Link. It contains an encrypted version of your Firebase Config so your team can join instantly without setup.",
            uk: "**Спільний доступ**: Натисніть кнопку **Копіювати посилання (🔗)**, щоб отримати захищене магічне посилання. Воно містить зашифровану версію конфігурації Firebase, тож ваша команда може приєднатися миттєво без налаштувань.",
        }
    },
    {
        keywords: ["restore", "backup", "upload"],
        answers: {
            en: "**Backup/Restore**: Go to the **Data Tab**. \n- **Download**: Save a .json backup. \n- **Restore**: Upload a .json backup. \n*Note: Restoring while connected will Sync/Overwrite the room data for everyone!*",
            uk: "**Резервне копіювання/Відновлення**: Перейдіть на вкладку **Дані**. \n- **Завантажити**: Збережіть резервну копію .json. \n- **Відновити**: Завантажте резервну копію. \n*Примітка: Відновлення під час підключення синхронізує/перезапише дані кімнати для всіх!*",
        }
    }
];

export let chatCtx = {
    lastNodeId: null,
    awaiting: null // e.g., { type: 'prop_type', propName: 'age', nodeId: '...' }
};

export function cleanInput(str) {
    return str.replace(/^(pls|please|kindly)\s+/i, '').trim();
}

/**
 * Processes the user's chat message and returns a response string or object.
 * @param {string} rawMsg - The user's message.
 * @param {Array} nodes - Current list of nodes/components.
 * @param {string} currentLang - Current language code (e.g., 'en', 'uk').
 * @param {Function} callbacks - Object containing callbacks for side effects (addNode, addProp, connect).
 * @returns {Promise<string|null>} The bot's response or null.
 */
export async function processUserIntent(rawMsg, nodes, currentLang, callbacks = {}) {
    const msg = cleanInput(rawMsg);
    const lower = msg.toLowerCase().trim();
    
    // --- INFO: FIREBASE / COLLABORATION ---
    if (lower.includes('firebase') || lower.includes('sync') || lower.includes('collaborat') || (lower.includes('share') && lower.includes('room'))) {
            return "To **collaborate** in real-time:\n" +
                "1. Create a Realtime Database on Firebase Console.\n" +
                "2. Copy the `firebaseConfig` object.\n" +
                "3. Paste it in the **Connect** tab.\n" +
                "4. Share the Room ID (or Magic Link) with others.";
    }

    // --- INFO: OFFLINE STATUS ---
    if (lower.includes('offline') || lower.includes('internet') || lower.includes('network') || lower.includes('online')) {
        return "I am an **offline-first AI assistant** running directly in your browser. I do not send your chat data to any external server (except for the real-time room sync if you use Firebase).";
    }

    // --- CONTEXT: WAIT FOR TYPE ---
    if (chatCtx.awaiting && chatCtx.awaiting.type === 'prop_type') {
        const node = nodes.find(n => n.id === chatCtx.awaiting.nodeId);
        if (node) {
             let type = lower.split(' ')[0].toUpperCase();
             // Validation / mapping
             if(['string','text','varchar'].includes(type.toLowerCase())) type = 'VARCHAR';
             if(['int','number','integer'].includes(type.toLowerCase())) type = 'INT';
             
             if (callbacks.addProp) {
                 await callbacks.addProp(node.id, chatCtx.awaiting.propName, type);
                 return `Added property **${chatCtx.awaiting.propName}** (${type}) to **${node.title}**.`;
             }
        }
        chatCtx.awaiting = null; // Expired context
    }
    
    // --- ACTION: CREATE COMPONENT ---
    const createMatch = lower.match(/(?:create|add|make|new)\s+(?:new\s+)?(?:component|table|collection|node|box)\s+(?:named\s+|called\s+|with\s+name\s+|title\s+)?(.+)/i);
    
    if (createMatch) {
        let titleCandidate = createMatch[1].trim();
        titleCandidate = titleCandidate.replace(/[.,;!?]$/, '');
        
        if (titleCandidate.startsWith("name ")) titleCandidate = titleCandidate.substring(5).trim();

        if(titleCandidate) {
            if (callbacks.addNode) {
                const node = await callbacks.addNode(titleCandidate);
                chatCtx.lastNodeId = node.id;
                return `Created component **${titleCandidate}**. You can add properties like "add email string".`;
            }
        }
    }

    // --- ACTION: ADD PROPERTY ---
    let targetNodeId = chatCtx.lastNodeId;
    let propName = null;
    let propType = null;
    let explicitTarget = false;

    const addToMatch = lower.match(/add\s+(?:property\s+)?(?:to|in|for)\s+(?:(?:table|component)\s+)?(\w+)\s+(?:property\s+|field\s+|column\s+)?(\w+)(?::\s*|\s+)?(\w+)?/i);
    if (addToMatch) {
        const targetName = addToMatch[1];
        propName = addToMatch[2];
        propType = addToMatch[3];
        
        const node = nodes.find(n => n.title.toLowerCase() === targetName.toLowerCase());
        if (node) {
            targetNodeId = node.id;
            // Update context
            chatCtx.lastNodeId = node.id;
            explicitTarget = true;
        } else {
            return `Could not find component named "**${targetName}**".`;
        }
    } 
    else if (lower.startsWith("add ")) {
            const parts = lower.replace("add ", "").trim().split(/\s+|:/);
            if (parts[0] === 'property' || parts[0] === 'prop' || parts[0] === 'column') parts.shift();
            propName = parts[0];
            propType = parts[1];
    }
    else if (chatCtx.lastNodeId) {
        const parts = lower.split(/\s+|:/);
        if (parts.length <= 2 && /^[a-z0-9_]+$/i.test(parts[0])) {
             // Heuristic: if it looks like "prop type"
             propName = parts[0];
             propType = parts[1];
        }
    }

    // EXECUTE PROPERTY ADDITION
    if (propName && targetNodeId) {
            const node = nodes.find(n => n.id === targetNodeId);
            if (node) {
                if (!propType) {
                    chatCtx.awaiting = { type: 'prop_type', propName: propName, nodeId: node.id };
                    return `What type should **${propName}** be? (e.g., VARCHAR, INT, UUID)`;
                }
                
                // Map common types
                let finalType = propType.toUpperCase();
                if(['string','text'].includes(propType.toLowerCase())) finalType = 'VARCHAR';
                if(['int','number'].includes(propType.toLowerCase())) finalType = 'INT';
                
                if (callbacks.addProp) {
                    await callbacks.addProp(node.id, propName, finalType);
                    return `Added **${propName}** (${finalType}) to **${node.title}**.`;
                }
            }
    }

    // --- ACTION: CONNECT ---
    const connectMatch = lower.match(/connect\s+(.+)\s+(?:to|with)\s+(.+)/);
    if (connectMatch) {
        const name1 = connectMatch[1].trim();
        const name2 = connectMatch[2].trim();
        
        const n1 = nodes.find(n => n.title.toLowerCase() === name1);
        const n2 = nodes.find(n => n.title.toLowerCase() === name2);
        
        if (n1 && n2) {
             if (callbacks.connect) {
                 await callbacks.connect(n1.id, n2.id);
                 return `Connected **${n1.title}** to **${n2.title}**.`;
             }
        } else {
             return "Could not find both components. Check spelling.";
        }
    }
    
    // --- ACTION: SUGGEST CONNECTION ---
    if (lower.includes("suggest") || lower.includes("help me connect")) {
            if (nodes.length < 2) return "You need at least 2 components to connect. Try creating another one.";
            return `You have ${nodes.length} components. You can connect them by typing "connect [Name1] to [Name2]". \nFor example: "connect ${nodes[0].title} to ${nodes[1].title}".`;
    }

    // --- KNOWLEDGE FALLBACK ---
    let found = kmDatabase.find(qa => qa.keywords.some(k => lower.includes(k)));
    if (found) {
        return found.answers[currentLang] || found.answers['en'];
    }

    return null; // No match
}
