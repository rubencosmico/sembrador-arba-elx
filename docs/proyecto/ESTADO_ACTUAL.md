# Estado Actual del Proyecto

**Última actualización:** 2026-11-14
**Rama principal en producción:** `main` (sincronizada con `feature/user-management-identity`)
**URL de Producción (Vercel):** https://sembrador-arba-elx.vercel.app

## 1. Situación General
- **Plan de Integración (Fases 1 a 4) COMPLETADO:** El repositorio ha sido saneado, estabilizado, validado íntegramente en Vercel Preview, respaldado en local (`backups/firestore-backup-2026-11-14T21-55-37-184Z.json`), migrado de forma aditiva e idempotente (`scripts/migrate-legacy-v2.js`), asegurado con las nuevas reglas de Firestore/Storage y fusionado en `main` para su despliegue en producción.
- Todos los datos reales de campo (`7` campañas, `16` grupos, `25` lotes de semillas y `420` logs) están conservados y normalizados en `arba-elx-siembra` (`artifacts/arba-elx/public/data/*`).

## 2. Capacidades Activas en Producción (`main`)
- **Identidad y Autenticación:** Login con Google, Email/Contraseña con medidor de seguridad (`auth-utils.js`), verificación de correo con reenvío seguro, recuperación de clave, Magic Link, gestión de perfil y vinculación/baja de proveedores (`ProfileView.jsx`).
- **Navegación Pública Segura:** Sesiones anónimas aisladas (`u.isAnonymous`) que permiten explorar mapa, jornadas y registros públicos sin crear perfiles basura en `/users`, solicitando inicio de sesión al intentar sembrar o acceder al cuaderno de campo (con botón de retorno en `LoginScreen.jsx`), y enlaces directos `?join=` recuperados vía `sessionStorage`.
- **Gestión de Campañas y Atribución Unificada:** `CampaignManager.jsx` con ordenación, mapas GPS, soporte legacy y moderno en semillas (`totalQuantity ?? quantity`), permisos para `ownerId`, `coordinators` e `isSuperAdmin`; atribución unificada `ownerId` + `userId` en `ClaimRecordsView.jsx`, `SuperAdminDashboard.jsx` y `SowerView.jsx` (`420/420` logs reconciliados).
- **Seguridad y Comunidad:** Consultas de mensajería y seguidores (`MessagesView.jsx`, `ChatWindow.jsx`, `SocialView.jsx`) alineadas con `firestore.rules` (ruleset `eaee2c8d-ff9a-4da3-a862-41279e7d1783`) y `storage.rules` (ruleset `be7ec24f-db84-4d9a-9db0-7a398858921f`).

## 3. Notas Operativas y Próximo Paso Opcional
- **Higiene opcional en Firebase Auth:** Cuando no se vayan a realizar más pruebas en ramas Preview antiguas, se pueden retirar de *Firebase Console → Authentication → Settings → Authorized domains* los subdominios temporales específicos de deploy (`...m0o4r4hrv...`, `...3or165t85...`).
- **Base de trabajo futura:** Para próximas funcionalidades (campaña de invierno, asignación granular de lotes por usuario, notificaciones o mejoras en `TODO.md`), crear nuevas ramas de trabajo desde `main` manteniendo `main` protegida hasta validar cada entrega en Vercel Preview.
