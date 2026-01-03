import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeAdmin() {
    const uid = 'uo8s4kCGgrZJwXETFtTGThFAATE2'; // uo8s4kCGgrZJwXETFtTGThFAATE2
    const email = 'ruben@filcorcomercial.com';

    console.log(`Otorgando permisos de Super-Admin a: ${email} (${uid})...`);

    await db.collection('admins').doc(uid).set({
        email: email,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        assignedBy: 'setup-script'
    });

    console.log('¡LISTO! Ahora eres Super-Admin.');
}

makeAdmin().catch(console.error);
