import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function drillDown(path = '', depth = 0) {
    if (depth > 8) return;

    try {
        const collections = path === ''
            ? await db.listCollections()
            : await db.doc(path).listCollections();

        for (const coll of collections) {
            console.log(`${'  '.repeat(depth)}[C] ${coll.id}`);

            // Ver qué hay dentro de esta colección
            const docs = await coll.listDocuments();
            if (docs.length === 0) {
                console.log(`${'  '.repeat(depth + 1)}(Colección sin documentos directos)`);
            }

            for (const docRef of docs.slice(0, 3)) { // Limitar a 3 docs por carpeta
                console.log(`${'  '.repeat(depth + 1)}[D] ${docRef.id}`);
                const snap = await docRef.get();
                if (snap.exists) {
                    const data = snap.data();
                    if (data.name) console.log(`${'  '.repeat(depth + 2)}Name: ${data.name}`);
                }
                await drillDown(docRef.path, depth + 1);
            }
        }
    } catch (e) {
        // console.error(`Err en ${path}: ${e.message}`);
    }
}

console.log('--- EXPLORACIÓN PROFUNDA (INCLUYENDO VIRTUALES) ---');
drillDown().then(() => console.log('--- FIN ---'));
