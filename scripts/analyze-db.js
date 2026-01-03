
const admin = require('firebase-admin');
const fs = require('fs');

const path = require('path');
const serviceAccountPath = path.join(__dirname, '../service-account.json');

// Check if service account exists
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: service-account.json not found at:', serviceAccountPath);
    console.log('Please place your service-account.json file in the root of the project.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function getFieldType(value) {
    if (value === null) return 'null';
    if (value instanceof admin.firestore.Timestamp) return 'timestamp';
    if (value instanceof admin.firestore.GeoPoint) return 'geopoint';
    if (value instanceof admin.firestore.DocumentReference) return 'reference';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

async function analyze() {
    try {
        console.log('🔍 Connecting to Firestore...');
        console.log(`ℹ️  Project ID: ${serviceAccount.project_id}`);

        // Target specific document path provided by user
        const targetDocPath = 'artifacts/arba-elx/public/data';
        const targetDocRef = db.doc(targetDocPath);

        console.log(`\nTargeting document: ${targetDocPath}`);
        const collections = await targetDocRef.listCollections();

        if (collections.length === 0) {
            console.log('No subcollections found under this document.');
            // Also check if root has anything differently named just in case
            return;
        }

        const collectionNames = collections.map(c => c.id);
        console.log(`\nFound ${collections.length} subcollections: ${collectionNames.join(', ')}\n`);
        console.log('Analyzing schema...\n');

        for (const collection of collections) {
            const collectionName = collection.id;
            // Get a sample of documents to infer schema
            const snapshot = await collection.limit(5).get();

            if (snapshot.empty) {
                console.log(`📂 Collection: ${collectionName} (Empty)`);
                continue;
            }

            console.log(`📂 Collection: ${collectionName} `);

            const schema = {};

            snapshot.forEach(doc => {
                const data = doc.data();
                Object.keys(data).forEach(key => {
                    const type = getFieldType(data[key]);
                    if (!schema[key]) {
                        schema[key] = new Set();
                    }
                    schema[key].add(type);
                });
            });

            // Print fields and their detected types
            Object.keys(schema).sort().forEach(field => {
                const types = Array.from(schema[field]).join(' | ');
                console.log(`  - ${field}: ${types} `);
            });
            console.log(''); // Empty line between collections
        }

        console.log('✅ Analysis complete.');

    } catch (error) {
        console.error('Error analyzing database:', error);
    } finally {
        // Force exit as firebase admin keeps connection open
        process.exit(0);
    }
}

analyze();
