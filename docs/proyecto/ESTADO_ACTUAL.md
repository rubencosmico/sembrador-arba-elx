# Estado Actual del Proyecto

**Última actualización:** 2026-11-14
**Rama activa:** `feature/user-management-identity`
**Rama de producción (intocable):** `main` (`91b0f14`)

## 1. Situación General
- **Fase 1 completada:** Se ha saneado por completo el repositorio Git eliminando las 14 ramas locales y 12 ramas remotas ya integradas en `main`, se actualizó `main` local (`91b0f14`) y se fusionó en `feature/user-management-identity` (`TODO.md` incorporado sin conflictos).
- Se eliminó `firebase-debug.log` y el componente huérfano `src/components/CampaignSelector.jsx`, se versionó `doc/datos_jornada_hFoDWjxbdbCzFj9rQRh1.csv` y se implantó el sistema de memoria persistente (`GEMINI.md`, `docs/proyecto/*`, `.agents/workflows/cerrar-sesion.md`).
- **Pendiente de consolidar en Fase 2:** Los cambios de trabajo previos en `src/*`, `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`, `vercel.json` y `src/utils/auth-utils.js` permanecen en el árbol de trabajo listos para corregir los bugs detectados y validar tests y build.

## 2. Qué está terminado en `feature/user-management-identity`
- UI y flujos de login con Google, registro Email/Contraseña con medidor de seguridad (`auth-utils.js`), recuperación de clave y Magic Link.
- Gestión de perfil (`ProfileView.jsx`) con subida de avatar, vinculación Google ↔ Contraseña y baja de cuenta.
- Nueva `LandingPage.jsx` con mapa global de jornadas y `CampaignDashboard.jsx` con filtros avanzados.
- `CampaignManager.jsx` unificado con gestión de participantes, coordinadores, lotes por usuario y borrado seguro de jornadas.
- Sistema de memoria persistente para agentes y saneamiento completo de ramas Git.

## 3. Problemas Bloqueantes Pendientes de Resolver antes de pasar a Preview/Main (Fase 2)
1. **Crashes en tiempo de ejecución:**
   - `src/App.jsx`: Variables no declaradas (`message`, `setMessage`, `setError`, `sendEmailVerification`) en la pantalla de bloqueo por verificación de email, y falta importar `deleteDoc` para dejar de seguir usuarios.
   - `src/components/CampaignManager.jsx`: Falta importar `MapPin` de `lucide-react` (rompe al expandir un log con GPS) y falta definir `handleSort` (rompe al ordenar columnas).
2. **Gestión de sesión anónima vs usuario autenticado:**
   - `src/App.jsx` crea perfiles `/users/{uid}` y solicita permisos de notificaciones Push para sesiones anónimas (`u.isAnonymous === true`).
   - `src/components/CampaignDashboard.jsx` evalúa `user` en vez de `user && !user.isAnonymous`, bloqueando el botón "Registrar Siembras" para visitantes no autenticados e ignorando a `campaign.coordinators` en `canManage`.
3. **Inconsistencia `ownerId` vs `userId` en registros reclamados:**
   - `SuperAdminDashboard.jsx` actualiza solo `ownerId: userId` al aprobar reclamaciones, pero `SowerView.jsx` y `CampaignDashboard.jsx` filtran "Mi Cuaderno de Campo" por `log.userId === user.uid`.
4. **Reglas de Firestore (`firestore.rules`) y Consultas:**
   - `SocialView.jsx` (`list` en `/users`), `MessagesView.jsx` / `ChatWindow.jsx` (query sin filtro `where` en `/messages`), los enlaces `?join=` y el borrado de lotes fallan con las reglas actuales.
5. **Tests rotos:**
   - `src/App.test.jsx` y `src/components/CoordinatorView.test.jsx` referencian vistas eliminadas (`CampaignSelector`, `WelcomeScreen`, `CoordinatorView`).

## 4. Siguiente Paso Inmediato
Iniciar la **Fase 2** del `ROADMAP.md`: corregir los crashes y bugs críticos en `src/App.jsx`, `CampaignDashboard.jsx`, `CampaignManager.jsx`, `SuperAdminDashboard.jsx`, `SowerView.jsx`, `MessagesView.jsx` y `ChatWindow.jsx`; actualizar `firestore.rules` (vía `firestore-rules-author`) y `firebase.json`; y actualizar los tests hasta que `npm run test:run` y `npm run build` pasen en verde.
