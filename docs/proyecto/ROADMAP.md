# Roadmap de Integración y Puesta en Producción

## Fase 1: Saneamiento del Repositorio y Memoria Persistente
- [x] Crear archivos del sistema de memoria persistente (`GEMINI.md`, `docs/proyecto/*`, `.agents/workflows/cerrar-sesion.md`).
- [x] Actualizar `main` local (`git fetch origin main:main`) e integrar `TODO.md` en `feature/user-management-identity`.
- [x] Eliminar las 14 ramas locales y 12 ramas remotas ya integradas en `main`.
- [x] Limpiar `firebase-debug.log` y eliminar el componente huérfano `src/components/CampaignSelector.jsx`.
- [x] Versionar `doc/datos_jornada_hFoDWjxbdbCzFj9rQRh1.csv` en `feature/user-management-identity`.

## Fase 2: Corrección de Bugs Críticos y Compatibilidad de Código
- [x] **Fix Crashes en `src/App.jsx`:** Importar `deleteDoc` y `sendEmailVerification`; declarar estados de mensaje/error en el Email Verification Gate.
- [x] **Fix Sesión Anónima en `src/App.jsx` y `CampaignDashboard.jsx`:** Evitar creación de perfiles `/users` y petición de Push para `u.isAnonymous`; distinguir `isRealUser = user && !user.isAnonymous`; incluir `campaign.coordinators` en `canManage`.
- [x] **Fix Crashes en `src/components/CampaignManager.jsx`:** Importar `MapPin`, implementar `handleSort`, y eliminar `orderBy('timestamp', 'desc')` de la query de logs para evitar requerir índice compuesto.
- [x] **Unificar Atribución `ownerId` / `userId`:** Actualizar `SuperAdminDashboard.jsx` para escribir `{ ownerId: userId, userId: userId, userName: req.userName }` al aprobar reclamaciones y soportar ambos campos en `SowerView.jsx` y `ClaimRecordsView.jsx`.
- [x] **Fix Consultas Sociales y Reglas (`firestore-rules-author`):** Ajustar queries en `MessagesView.jsx` y `ChatWindow.jsx`; corregir `firestore.rules` (lectura de `/users`, guardas `request.resource != null` en `delete`, auto-unión en `?join=`) y `firebase.json`.
- [x] **Actualizar Suite de Tests:** Adaptar `src/App.test.jsx` y reemplazar `src/components/CoordinatorView.test.jsx` para que `npm run test:run` y `npm run build` pasen al 100 %.

## Fase 3: Validación en Entorno Preview de Vercel
- [ ] Subir cambios a `origin/feature/user-management-identity` y verificar despliegue Preview en Vercel.
- [ ] Autorizar el dominio Preview de Vercel en Firebase Authentication → Authorized domains.
- [ ] Ejecutar pruebas funcionales completas en Preview (login Google/Email/Magic Link, reclamación de logs reales, creación y borrado de jornada de prueba).

## Fase 4: Migración de Datos y Paso a Producción (`main`)
- [ ] Ejecutar backup completo de Firestore a JSON local (`scripts/backup-firestore.js`).
- [ ] Ejecutar script idempotente `scripts/migrate-legacy-v2.js` (normalización de campañas con `ownerId` por defecto `uo8s4kCGgrZJwXETFtTGThFAATE2`, lotes y reconciliación de logs reclamados sin límite de 400 documentos).
- [ ] Desplegar `firestore.rules` y `storage.rules` en Firebase (`arba-elx-siembra`).
- [ ] Hacer merge de `feature/user-management-identity` a `main`, push a `origin/main` y verificar en producción para la campaña de invierno.

