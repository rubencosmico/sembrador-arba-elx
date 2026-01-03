import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function recursiveScan(path = '', depth = 0) {
    if (depth > 6) return; // Limitar profundidad

    try {
        const collections = path === ''
            ? await db.listCollections()
            : await db.doc(path).listCollections();

        for (const coll of collections) {
            const collPath = path === '' ? coll.id : `${path}/${coll.id}`;
            console.log(`${'  '.repeat(depth)}[C] ${collPath}`);

            const snap = await coll.limit(3).get();
            for (const doc of snap.docs) {
                const docPath = `${collPath}/${doc.id}`;
                console.log(`${'  '.repeat(depth + 1)}[D] ${docPath}`);

                // Si el documento parece una campaña, mostrarlo
                const data = doc.data();
                if (data.name || data.visibility || data.campaignId) {
                    console.log(`${'  '.repeat(depth + 2)}Data: ${JSON.stringify(data).substring(0, 100)}...`);
                }

                await recursiveScan(docPath, depth + 1);
            }
        }
    } catch (e) {
        // console.error(`Error en ${path}:`, e.message);
    }
}

console.log('--- INICIANDO ESCANEO COMPLETO ---');
recursiveScan().then(() => console.log('--- ESCANEO FINALIZADO ---'));
