# Estado Actual del Proyecto

**Última actualización:** 2026-11-14
**Rama activa:** `feature/user-management-identity`
**Rama de producción (intocable):** `main` (`91b0f14`)

## 1. Situación General
- **Fase 1 y Fase 2 completadas, Fase 3 en curso:** El repositorio está saneado (`main` y `feature/user-management-identity`), se publicó la rama en `origin` para el entorno Preview de Vercel y se corrigió un error de pantalla en blanco en build de producción provocado por la separación de `react-leaflet` respecto a `react` en `vite.config.js` (`manualChunks`) junto con una guarda `try / catch` para `getMessaging(app)` en `src/firebase.js`.
- **Pendiente de validación funcional en Vercel Preview (Fase 3):** Tras redesplegar la corrección en `origin/feature/user-management-identity`, queda completar la batería de pruebas funcionales en el nuevo Preview (login Google/Email/Magic Link, `?join=`, creación/borrado de jornada de prueba y reclamación de históricos) antes de pasar a la Fase 4.

## 2. Qué está terminado en `feature/user-management-identity`
- UI y flujos completos de autenticación: Google, Email/Contraseña con medidor de seguridad (`auth-utils.js`), verificación de email con envío/reenvío seguro, recuperación de clave, Magic Link y baja/vinculación de proveedores (`ProfileView.jsx`).
- Aislamiento de sesión anónima (`u.isAnonymous`) para navegación pública en `LandingPage.jsx` y `CampaignDashboard.jsx` sin contaminar `/users` ni solicitar permisos Push innecesarios, junto con recuperación automática de enlaces `?join=` vía `sessionStorage`.
- `CampaignManager.jsx` estabilizado con ordenación (`handleSort`), mapa GPS (`MapPin`), soporte para lotes legacy (`seed.totalQuantity ?? seed.quantity`), permisos para `ownerId`, `coordinators` e `isSuperAdmin`, y atribución consistente `ownerId || userId`.
- Reclamación de registros históricos (`ClaimRecordsView.jsx` y `SuperAdminDashboard.jsx`) compatible con logs legacy de `main` (`ownerId` ausente o `null`) y sincronización hacia `userId` + `ownerId`.
- Consultas sociales y de mensajería alineadas con `firestore.rules` (`MessagesView.jsx`, `ChatWindow.jsx`), y reglas endurecidas en `firestore.rules` (`users`, `campaigns` con self-join, `seeds`/`groups` con `delete` seguro, `logs` hasta 1000 golpes con soporte `ownerId` y compatibilidad legacy).
- Suite de tests unitarios/integración actualizada (`src/App.test.jsx`, `src/components/SowerView.test.jsx`, `src/components/CampaignManager.test.jsx`).

## 3. Riesgos o Pendientes antes de Pasar a `main`
- **No desplegar aún `firestore.rules` en Firebase:** Algunas comprobaciones nuevas sobre campos/tamaños deben validarse en entorno de pruebas y coordinarse con la migración de Fase 4 para no interferir con `main` en campo.
- **Dominio Preview de Vercel:** Tras hacer push de `feature/user-management-identity`, será necesario añadir la URL Preview generada en *Firebase Console → Authentication → Settings → Authorized domains* para probar el login con Google y Magic Link.
- **Migración de datos históricos (Fase 4):** Sigue pendiente ejecutar el backup JSON local y el script idempotente que asigne `ownerId: 'uo8s4kCGgrZJwXETFtTGThFAATE2'` a las campañas legacy y normalice lotes/logs antiguos antes del merge a `main`.

## 4. Siguiente Paso Inmediato
Continuar la **Fase 3** del `ROADMAP.md`: comprobar la nueva URL Preview de Vercel (o su alias de rama en `Authorized domains` de Firebase Authentication) y ejecutar la validación funcional completa antes de abordar los backups, migración de datos y despliegue de reglas en la **Fase 4**.
