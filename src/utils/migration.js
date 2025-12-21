import { collection, getDocs, query, where, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';

export const migrateOrphanData = async (db, appId) => {
    try {
        const collections = ['seeds', 'groups', 'logs'];
        const needsMigration = {};

        console.log("--------------------------------");
        console.log("STARTING DATA AUDIT");

        // Check for orphans
        for (const colName of collections) {
            const q = collection(db, 'artifacts', appId, 'public', 'data', colName);
            const snapshot = await getDocs(q);

            const total = snapshot.docs.length;
            const orphans = snapshot.docs.filter(doc => !doc.data().campaignId);
            const campaigns = {};
            snapshot.docs.forEach(d => {
                const cid = d.data().campaignId || 'ORPHAN';
                campaigns[cid] = (campaigns[cid] || 0) + 1;
            });

            console.log(`Collection [${colName}]: Total ${total} docs.`);
            console.log(`   - Orphans: ${orphans.length}`);
            console.log(`   - Distribution:`, campaigns);

            if (orphans.length > 0) {
                needsMigration[colName] = orphans;
            }
        }
        console.log("--------------------------------");

        const totalOrphans = Object.values(needsMigration).reduce((acc, curr) => acc + curr.length, 0);

        if (totalOrphans === 0) {
            console.log("No orphans found. Everything seems clean.");
            alert("No hay datos antiguos para migrar. Todo parece estar en orden.");
            return;
        }

        console.log(`Found ${totalOrphans} orphan documents to migrate.`);

        // Create Archive Campaign or find it
        const campaignsRef = collection(db, 'artifacts', appId, 'public', 'data', 'campaigns');
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

        console.log(`Migrating to campaign: ${archiveId} (Jornada 1)`);

        // Batch update (chunking to respect limits)
        const CHUNK_SIZE = 10;
        let currentBatch = writeBatch(db);
        let batchCount = 0;
        let operationCount = 0;

        for (const colName in needsMigration) {
            for (const docSnapshot of needsMigration[colName]) {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', colName, docSnapshot.id);
                currentBatch.update(docRef, { campaignId: archiveId });
                batchCount++;
                operationCount++;

                if (batchCount >= CHUNK_SIZE) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    batchCount = 0;
                }
            }
        }

        if (batchCount > 0) {
            await currentBatch.commit();
        }

        if (operationCount > 0) {
            console.log(`Migration complete. Migrated ${operationCount} docs.`);
            alert(`Se han migrado ${operationCount} datos antiguos a 'Jornada 1 (Archivo)'`);
        } else {
            console.log("Migration finished but 0 operations?");
        }

    } catch (e) {
        console.error("Migration failed", e);
        alert("Error en la migración: " + e.message);
    }
};
