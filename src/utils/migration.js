import { collection, getDocs, query, where, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';

export const migrateOrphanData = async (db, appId) => {
    try {
        const collections = ['seeds', 'groups', 'logs'];
        const needsMigration = {};

        // Check for orphans
        for (const colName of collections) {
            // Firestore doesn't support checking for "missing field" easily in one query without an index (sometimes).
            // But we can check for campaignId == null or missing? 
            // Actually, querying for null doesn't find missing fields.
            // Safest way for small dataset: fetch all and check. 
            // If dataset is huge, this is bad. Assuming reasonable size for now.
            // BETTER: Use a marker to run only once? No, requirements say "Al iniciar la app... detecta si hay documentos huérfanos".

            // For now, let's fetch all and check client side. 
            // In a real huge app, we'd use a cloud function.
            const q = collection(db, 'artifacts', appId, 'public', 'data', colName);
            const snapshot = await getDocs(q);
            const orphans = snapshot.docs.filter(doc => !doc.data().campaignId);

            if (orphans.length > 0) {
                needsMigration[colName] = orphans;
            }
        }

        const totalOrphans = Object.values(needsMigration).reduce((acc, curr) => acc + curr.length, 0);

        if (totalOrphans === 0) return;

        console.log(`Found ${totalOrphans} orphan documents. Migrating...`);

        // Create Archive Campaign
        // Check if exists first? Or just create "Jornada 1 (Archivo)"
        // To avoid dupes, we could query campaigns by name, but creating a new one is safer if we just want to dump orphans.
        // Let's create one.

        const campaignsRef = collection(db, 'artifacts', appId, 'public', 'data', 'campaigns');
        // Check if "Jornada 1 (Archivo)" exists
        const campQ = query(campaignsRef, where("name", "==", "Jornada 1 (Archivo)"));
        const campSnap = await getDocs(campQ);

        let archiveId;
        if (!campSnap.empty) {
            archiveId = campSnap.docs[0].id;
        } else {
            const newCamp = await addDoc(campaignsRef, {
                name: "Jornada 1 (Archivo)",
                createdAt: serverTimestamp(),
                status: 'archived'
            });
            archiveId = newCamp.id;
        }

        // Batch update (limit 500 per batch)
        const batch = writeBatch(db);
        let operationCount = 0;

        for (const colName in needsMigration) {
            for (const docSnapshot of needsMigration[colName]) {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', colName, docSnapshot.id);
                batch.update(docRef, { campaignId: archiveId });
                operationCount++;
            }
        }

        if (operationCount > 0) {
            await batch.commit();
            console.log("Migration complete.");
            alert(`Se han migrado ${operationCount} datos antiguos a 'Jornada 1 (Archivo)'`);
        }

    } catch (e) {
        console.error("Migration failed", e);
    }
};
