import admin from 'firebase-admin';
import fs from 'fs';

const SERVICE_ACCOUNT_PATH = './service-account.json';
const APP_ID = 'arba-elx';
const DEFAULT_OWNER_ID = 'uo8s4kCGgrZJwXETFtTGThFAATE2';
const MAX_BATCH_OPS = 400;

const executeMode = process.argv.includes('--execute');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Error: No se encuentra ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

class ChunkedBatchWriter {
    constructor(firestore, dryRun) {
        this.firestore = firestore;
        this.dryRun = dryRun;
        this.batch = firestore.batch();
        this.pendingCount = 0;
        this.committedBatches = 0;
        this.totalOperations = 0;
    }

    async update(docRef, data) {
        this.totalOperations++;
        if (this.dryRun) return;

        this.batch.update(docRef, data);
        this.pendingCount++;

        if (this.pendingCount >= MAX_BATCH_OPS) {
            await this.flush();
        }
    }

    async flush() {
        if (this.dryRun || this.pendingCount === 0) return;
        await this.batch.commit();
        this.committedBatches++;
        console.log(`  [Batch #${this.committedBatches}] Confirmadas ${this.pendingCount} operaciones.`);
        this.batch = this.firestore.batch();
        this.pendingCount = 0;
    }
}

async function migrateLegacyV2() {
    const modeLabel = executeMode ? 'EJECUCIÓN REAL (--execute)' : 'SIMULACIÓN SOLO LECTURA (--dry-run)';
    console.log(`\n=== MIGRACIÓN LEGACY V2 — ${modeLabel} ===`);
    console.log(`Proyecto: ${serviceAccount.project_id} | appId: ${APP_ID}`);
    console.log(`Owner por defecto para campañas legacy: ${DEFAULT_OWNER_ID}\n`);

    const dataPath = `artifacts/${APP_ID}/public/data`;
    const writer = new ChunkedBatchWriter(db, !executeMode);

    // 1. Campañas
    const campaignsSnap = await db.collection(`${dataPath}/campaigns`).get();
    let campaignUpdates = 0;
    const campaignDetails = [];

    for (const docSnap of campaignsSnap.docs) {
        const data = docSnap.data();
        const updates = {};
        const effectiveOwnerId = data.ownerId || DEFAULT_OWNER_ID;

        if (!data.ownerId) {
            updates.ownerId = effectiveOwnerId;
        }
        if (!data.visibility) {
            updates.visibility = 'public';
        }
        if (!Array.isArray(data.coordinators)) {
            updates.coordinators = [];
        }
        if (!Array.isArray(data.participants)) {
            updates.participants = [effectiveOwnerId];
        } else if (!data.participants.includes(effectiveOwnerId)) {
            updates.participants = [...data.participants, effectiveOwnerId];
        }

        if (Object.keys(updates).length > 0) {
            campaignUpdates++;
            campaignDetails.push({ id: docSnap.id, name: data.name, updates });
            await writer.update(docSnap.ref, updates);
        }
    }

    console.log(`1) Campañas revisadas: ${campaignsSnap.size} | A actualizar: ${campaignUpdates}`);
    for (const item of campaignDetails) {
        console.log(`   - ${item.id} (${item.name}): ${JSON.stringify(item.updates)}`);
    }

    // 2. Semillas
    const seedsSnap = await db.collection(`${dataPath}/seeds`).get();
    let seedUpdates = 0;
    const seedFieldCounts = { totalQuantity: 0, remainingQuantity: 0, userAssignments: 0 };

    for (const docSnap of seedsSnap.docs) {
        const data = docSnap.data();
        const updates = {};
        const fallbackQty = Math.max(0, Number(data.quantity) || 0);

        if (data.totalQuantity === undefined) {
            updates.totalQuantity = fallbackQty;
            seedFieldCounts.totalQuantity++;
        }
        if (data.remainingQuantity === undefined) {
            updates.remainingQuantity = fallbackQty;
            seedFieldCounts.remainingQuantity++;
        }
        if (!Array.isArray(data.userAssignments)) {
            updates.userAssignments = [];
            seedFieldCounts.userAssignments++;
        }

        if (Object.keys(updates).length > 0) {
            seedUpdates++;
            await writer.update(docSnap.ref, updates);
        }
    }

    console.log(`\n2) Semillas revisadas: ${seedsSnap.size} | A actualizar: ${seedUpdates}`);
    console.log(`   - Campos añadidos -> totalQuantity: ${seedFieldCounts.totalQuantity}, remainingQuantity: ${seedFieldCounts.remainingQuantity}, userAssignments: ${seedFieldCounts.userAssignments}`);

    // 3. Reclamaciones aprobadas + Logs
    const claimsSnap = await db.collection('claimRequests').where('status', '==', 'approved').get();
    const approvedClaimsMap = new Map();
    claimsSnap.forEach((docSnap) => {
        const req = docSnap.data();
        if (Array.isArray(req.logIds) && req.userId) {
            for (const logId of req.logIds) {
                approvedClaimsMap.set(logId, {
                    userId: req.userId,
                    userName: req.userName || null
                });
            }
        }
    });

    const logsSnap = await db.collection(`${dataPath}/logs`).get();
    let logUpdates = 0;
    let initNullOwner = 0;
    let syncedUserId = 0;
    let syncedUserName = 0;
    const sampleLogUpdates = [];

    for (const docSnap of logsSnap.docs) {
        const data = docSnap.data();
        const claimInfo = approvedClaimsMap.get(docSnap.id);
        const updates = {};

        let effectiveOwnerId = data.ownerId;
        if (data.ownerId === undefined) {
            effectiveOwnerId = claimInfo?.userId || null;
            updates.ownerId = effectiveOwnerId;
            if (effectiveOwnerId === null) initNullOwner++;
        } else if (data.ownerId === null && claimInfo?.userId) {
            effectiveOwnerId = claimInfo.userId;
            updates.ownerId = effectiveOwnerId;
        }

        if (typeof effectiveOwnerId === 'string' && effectiveOwnerId.length > 0) {
            if (data.userId !== effectiveOwnerId) {
                updates.userId = effectiveOwnerId;
                syncedUserId++;
            }
            if (claimInfo?.userName && data.userName !== claimInfo.userName) {
                updates.userName = claimInfo.userName;
                syncedUserName++;
            }
        }

        if (Object.keys(updates).length > 0) {
            logUpdates++;
            if (sampleLogUpdates.length < 5) {
                sampleLogUpdates.push({ id: docSnap.id, prevUserId: data.userId, prevOwnerId: data.ownerId, updates });
            }
            await writer.update(docSnap.ref, updates);
        }
    }

    console.log(`\n3) Logs revisados: ${logsSnap.size} (reclamaciones aprobadas indexadas: ${approvedClaimsMap.size}) | A actualizar: ${logUpdates}`);
    console.log(`   - ownerId=null inicializados: ${initNullOwner}`);
    console.log(`   - userId sincronizados con ownerId: ${syncedUserId}`);
    console.log(`   - userName sincronizados desde reclamación: ${syncedUserName}`);
    if (sampleLogUpdates.length > 0) {
        console.log('   - Muestra de actualizaciones en logs:');
        for (const s of sampleLogUpdates) {
            console.log(`     * ${s.id} (prev userId=${s.prevUserId}, ownerId=${s.prevOwnerId}) -> ${JSON.stringify(s.updates)}`);
        }
    }

    await writer.flush();

    console.log(`\nTotal de operaciones ${executeMode ? 'ejecutadas' : 'planificadas'}: ${writer.totalOperations}`);
    if (!executeMode) {
        console.log('Modo simulación finalizado. No se modificó ningún documento en Firestore.');
        console.log('Para aplicar estos cambios reales, ejecuta: node scripts/migrate-legacy-v2.js --execute');
    } else {
        console.log(`Migración ejecutada con éxito en ${writer.committedBatches} batch(es).`);
    }
}

migrateLegacyV2()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error en migración:', err);
        process.exit(1);
    });

