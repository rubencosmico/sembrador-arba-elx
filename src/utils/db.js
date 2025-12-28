
const DB_NAME = 'arba-elx-offline-db';
const STORE_PHOTOS = 'photos-queue';
const DB_VERSION = 1;

export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject('IndexedDB error: ' + event.target.error);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
                db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
    });
};

export const saveOfflineItem = async (item) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PHOTOS], 'readwrite');
        const store = transaction.objectStore(STORE_PHOTOS);
        // Ensure timestamp
        const record = { ...item, timestamp: item.timestamp || Date.now() };
        const request = store.put(record);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getOfflinePhoto = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PHOTOS], 'readonly');
        const store = transaction.objectStore(STORE_PHOTOS);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getAllOfflinePhotos = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PHOTOS], 'readonly');
        const store = transaction.objectStore(STORE_PHOTOS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const deleteOfflinePhoto = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PHOTOS], 'readwrite');
        const store = transaction.objectStore(STORE_PHOTOS);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};
