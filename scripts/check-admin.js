import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAdmin() {
    const email = 'ruben@filcorcomercial.com';
    console.log(`Buscando usuario: ${email}...`);

    const usersSnap = await db.collection('users').where('email', '==', email).get();

    if (usersSnap.empty) {
        console.log('Usuario no encontrado en la colección "users".');
        return;
    }

    const userDoc = usersSnap.docs[0];
    const uid = userDoc.id;
    console.log(`Usuario encontrado! UID: ${uid}`);

    const adminDoc = await db.collection('admins').doc(uid).get();

    if (adminDoc.exists) {
        console.log('¡CONFIRMADO! El usuario está en la colección "admins". Es Super-Admin.');
    } else {
        console.log('EL USUARIO NO ES ADMIN. No existe un documento con su UID en la colección "admins".');

        // Opcional: Mostrar quiénes son los admins actuales
        const allAdmins = await db.collection('admins').get();
        console.log('Admins actuales (UIDs):', allAdmins.docs.map(d => d.id));
    }
}

checkAdmin().catch(console.error);
