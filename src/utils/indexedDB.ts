import { NodeData, EdgeData } from './types';

const DB_NAME = 'ComponentGraphDB';
const DB_VERSION = 2;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('nodes')) db.createObjectStore('nodes', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('edges')) db.createObjectStore('edges', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('config')) db.createObjectStore('config', { keyPath: 'key' });
            if (!db.objectStoreNames.contains('comments')) db.createObjectStore('comments', { keyPath: 'id' });
        };

        request.onsuccess = (e) => {
            resolve((e.target as IDBOpenDBRequest).result);
        };

        request.onerror = (e) => {
            reject((e.target as IDBOpenDBRequest).error);
        };
    });
};

export const dbOp = async <T>(
    storeName: 'nodes' | 'edges' | 'config' | 'comments',
    mode: IDBTransactionMode,
    op: 'put' | 'get' | 'getAll' | 'delete' | 'clear',
    data?: any
): Promise<T> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        
        let request: IDBRequest;
        if (op === 'put') request = store.put(data);
        else if (op === 'get') request = store.get(data);
        else if (op === 'getAll') request = store.getAll();
        else if (op === 'delete') request = store.delete(data);
        else if (op === 'clear') request = store.clear();
        else {
            reject(new Error(`Unknown operation: ${op}`));
            return;
        }

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};
