# Code Refactoring Map

## Components Structure

### 1. `src/components/Sidebar/Sidebar.tsx`
**Responsible for:** Main Sidebar container and tab switching.
**Original Code Relations:**
- HTML: `#sidebar`, `#sidebar-nav`, `#sidebar-content`, `#sidebar-footer`
- JS: `toggleSidebar`, `switchTab`

#### `src/components/Sidebar/tabs/CreateTab.tsx`
**Responsible for:** Creating new components and bulk import.
**Original Code Relations:**
- HTML: `#tab-create`
- JS: `createNewComponent`, `resetComponentForm`, `processBulkComponentFiles`, `addPropInput`, `parseJsonProps`

#### `src/components/Sidebar/tabs/ConnectTab.tsx`
**Responsible for:** Connecting components via form.
**Original Code Relations:**
- HTML: `#tab-connect`
- JS: `createConnection`, `updatePropSelects`

#### `src/components/Sidebar/tabs/DataTab.tsx`
**Responsible for:** Firebase sync config, Export/Import, History.
**Original Code Relations:**
- HTML: `#tab-data`
- JS: `initFirebase`, `connectToRoom`, `disconnectAndReset`, `shareRoomLink`, `exportJSON`, `importJSON`, `openCSVModal`, `downloadImage`

#### `src/components/Sidebar/tabs/SettingsTab.tsx`
**Responsible for:** User profile, theme, language, reset.
**Original Code Relations:**
- HTML: `#tab-settings`
- JS: `toggleTheme`, `changeLanguage`, `saveSettingsName`, `saveSettingsColor`, `clearAllAppData`

### 2. `src/components/Canvas/GraphCanvas.tsx`
**Responsible for:** D3.js visualization, node rendering, edge rendering, physics simulation.
**Original Code Relations:**
- HTML: `#diagram-container`, `#graph-svg`, `#zoom-group`
- JS: `d3` setup, `updateGraph`, `ticked`, `drag` handlers, `drawCurve`, `wrapText`, `cursors-layer` logic.

### 3. `src/components/Canvas/Toolbar.tsx`
**Responsible for:** Graph title, user badge, comments toggle, tooltips.
**Original Code Relations:**
- HTML: `#app > header area`, `#header-controls`
- JS: `syncGraphName`, `toggleCommentsWindow`

### 4. `src/components/Chatbot/Chatbot.tsx`
**Responsible for:** AI Assistant widget.
**Original Code Relations:**
- HTML: `#ai-fab-container` (implied from styles/logic)
- JS: `toggleAiWindow`, `handleAiMessage` (implied)

### 5. `src/components/Modals/*`
- `HistoryModal.tsx`: `showHistoryModal`
- `ContactModal.tsx`: `openContactModal`
- `HelpModal.tsx`: `openHelpModal`
- `CSVModal.tsx`: `openCSVModal`, `processSingleCSVImport`
- `WelcomeModal.tsx`: `checkFirstTimeUser`

### 6. `src/utils/firebase.ts`
**Responsible for:** Firebase initialization and sync logic.
**Original Code Relations:**
- JS: `initFirebase`, `startSyncListeners`, `handleRemoteNode`, `handleRemoteEdge`, `sanitizeForFirebase`

### 7. `src/utils/indexedDB.ts`
**Responsible for:** Local storage persistence.
**Original Code Relations:**
- JS: `initDB`, `dbOp`

### 8. `src/context/GraphContext.tsx`
**Responsible for:** Global state (nodes, edges, user, settings).
**Original Code Relations:**
- JS Variables: `nodes`, `edges`, `currentLang`, `myUserId`, `currentRoomId`
