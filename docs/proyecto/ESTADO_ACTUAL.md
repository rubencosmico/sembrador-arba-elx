# Estado Actual del Proyecto

**Última actualización:** 2026-11-14
**Rama activa:** `feature/user-management-identity`
**Rama de producción (intocable):** `main` (`91b0f14`)

## 1. Situación General
- **Fase 1 y Fase 2 completadas en local:** El repositorio está saneado (`main` y `feature/user-management-identity` como únicas ramas), todos los bugs bloqueantes y problemas de compatibilidad detectados en la auditoría han sido corregidos, `firestore.rules` ha sido actualizado y validado manualmente contra las consultas de la app mediante `firestore-rules-author`, y tanto la suite Vitest (`7` ficheros, `15` tests) como el build de producción (`vite build`) pasan en local sin errores.
- **Pendiente de validación en remoto (Fase 3):** Los commits de Fase 1 y Fase 2 residen únicamente en `feature/user-management-identity` local (pendientes de `git push` tras confirmación del usuario). Las reglas de `firestore.rules` y los datos de producción en `arba-elx-siembra` siguen intactos sin desplegar hasta completar las pruebas Preview y la migración de Fase 4.

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
Iniciar la **Fase 3** del `ROADMAP.md`: tras recibir confirmación del usuario, ejecutar `git push -u origin feature/user-management-identity` para disparar el despliegue Preview en Vercel, autorizar su dominio en Firebase Authentication y realizar las pruebas funcionales de validación.
