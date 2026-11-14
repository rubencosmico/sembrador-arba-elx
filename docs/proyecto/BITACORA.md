# Bitácora Técnica del Proyecto

## [2026-11-14] — Fase 1: Saneamiento de Ramas Git y Sistema de Memoria Persistente

### Resumen de la Sesión
Se ejecutó el Paso 1 del plan aprobado sobre `feature/user-management-identity` tras confirmar mantener el nombre de la rama, versionar `doc/datos_jornada_hFoDWjxbdbCzFj9rQRh1.csv` y utilizar el UID `uo8s4kCGgrZJwXETFtTGThFAATE2` como propietario por defecto en la futura migración.

### Cambios Implementados
- **Saneamiento Git:** Se actualizó `main` local (`781ead3` → `91b0f14`), se integró `TODO.md` en `feature/user-management-identity` mediante merge limpio sin conflictos y se eliminaron 14 ramas locales y 12 ramas remotas ya integradas en `main`.
- **Limpieza:** Se eliminó `firebase-debug.log` y el archivo huérfano `src/components/CampaignSelector.jsx`. Se versionó `doc/datos_jornada_hFoDWjxbdbCzFj9rQRh1.csv`.
- **Memoria Persistente:** Creados `GEMINI.md`, `docs/proyecto/ARQUITECTURA.md`, `docs/proyecto/ESTADO_ACTUAL.md`, `docs/proyecto/ROADMAP.md`, `docs/proyecto/BITACORA.md` y `.agents/workflows/cerrar-sesion.md`.

### Próximos Pasos
- Abordar la **Fase 2** del `ROADMAP.md` (corrección de bugs críticos, compatibilidad `ownerId`/`userId`, actualización de `firestore.rules` y suite de tests).

---

## [2026-11-14] — Auditoría Inicial de Ramas, Código y Compatibilidad Firebase

### Resumen de la Sesión
Se realizó una auditoría completa en modo lectura del historial de Git y del código fuente comparando `main` (`781ead3` / `origin/main` `91b0f14`) frente a `feature/user-management-identity` (`6800913` + cambios locales).

### Hallazgos Principales
1. **Ramas de Git:**
   - Se identificaron 14 ramas locales y 12 ramas remotas 100 % fusionadas en `main`, listas para eliminarse sin pérdida de historial.
   - `origin/main` solo contiene 1 commit adicional (`91b0f14`, añade `TODO.md`), por lo que no existen conflictos de código con `feature/user-management-identity`.
2. **Estado del Código en `feature/user-management-identity`:**
   - Se detectaron crashes por referencias no declaradas en `src/App.jsx` (`message`, `setMessage`, `setError`, `sendEmailVerification` en Email Verification Gate; `deleteDoc` en `handleSocialAction`) y en `src/components/CampaignManager.jsx` (`MapPin` no importado y `handleSort` no definido).
   - Se detectó que el login anónimo silencioso (`signInAnonymously`) dispara la creación de perfiles en `/users/{uid}` y bloquea botones en `CampaignDashboard.jsx` al evaluarse `user` como truthy.
3. **Compatibilidad de Datos y Reglas en Firebase:**
   - Descubierta discrepancia crítica entre `ClaimRecordsView`/`SuperAdminDashboard` (que usan `ownerId`) y `SowerView`/`CampaignDashboard`/`CampaignManager`/`firestore.rules` (que usan `userId`). Se definió la estrategia de unificación y migración idempotente.
   - Revisadas `firestore.rules` y `storage.rules`, identificando bloqueos en `SocialView`, `MessagesView`, `ChatWindow`, enlaces de invitación `?join=` y borrado de documentos en subcolecciones.

### Próximos Pasos
- Ejecutar limpieza de ramas, implantar los archivos de memoria persistente y abordar la Fase 2 del `ROADMAP.md`.
