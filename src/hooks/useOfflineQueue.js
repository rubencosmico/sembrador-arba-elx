
import { useState, useEffect } from 'react';
import { saveOfflineItem, getAllOfflinePhotos, deleteOfflinePhoto } from '../utils/db';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

export const useOfflineQueue = (storage, db) => {
    const [pendingCount, setPendingCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        updateCount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Sync effect
    useEffect(() => {
        if (isOnline && storage && db) {
            processQueue();
        }
    }, [isOnline, storage, db]);

    const updateCount = async () => {
        try {
            const photos = await getAllOfflinePhotos();
            setPendingCount(photos.length);
        } catch (e) {
            console.error("Error reading offline queue", e);
        }
    }

    const processQueue = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const photos = await getAllOfflinePhotos();
            console.log(`Processing ${photos.length} offline items`);

            for (const item of photos) {
                try {
                    if (!item.storagePath || !item.firestorePath || !item.photoData) {
                        console.warn("Invalid item in queue", item);
                        await deleteOfflinePhoto(item.id);
                        continue;
                    }

                    console.log(`Uploading ${item.id}...`);
                    // Upload
                    const photoRef = ref(storage, item.storagePath);
                    await uploadString(photoRef, item.photoData, 'data_url');
                    const downloadUrl = await getDownloadURL(photoRef);

                    // Update Firestore
                    const docRef = doc(db, item.firestorePath);

                    await updateDoc(docRef, {
                        photoUrl: downloadUrl,
                        syncStatus: 'synced'
                    });

                    // Delete from IDB
                    await deleteOfflinePhoto(item.id);
                    console.log(`Synced ${item.id}`);

                } catch (e) {
                    console.error("Sync failed for item", item.id, e);
                    // Keep in queue for retry?
                    // If network error, we stop list
                    if (!navigator.onLine) break;
                }
            }
        } finally {
            setIsSyncing(false);
            updateCount();
        }
    }

    const saveToQueue = async (logId, photoData, storagePath, firestorePath) => {
        await saveOfflineItem({
            id: logId,
            photoData,
            storagePath,
            firestorePath
        });
        updateCount();
    }

    return { isOnline, pendingCount, saveToQueue };
}
