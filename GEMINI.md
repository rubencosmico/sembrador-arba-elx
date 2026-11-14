# Reglas Operativas del Proyecto — Sembrador ARBA Elx

> [!CAUTION]
> **PROTECCIÓN CRÍTICA DE DATOS DE PRODUCCIÓN (FIREBASE):**
> La base de datos de Firebase (`arba-elx-siembra`, ruta `artifacts/arba-elx/public/data/*`) contiene **datos reales e irremplazables de jornadas de reforestación en campo**.
> 1. **PROHIBIDO** ejecutar operaciones destructivas (`delete`, `overwrite`, limpieza de colecciones) sobre documentos reales en `campaigns`, `seeds`, `groups` o `logs`.
> 2. Cualquier script de migración debe ser **aditivo, idempotente** y ejecutarse únicamente tras generar una copia de seguridad completa en local.
> 3. **PROHIBIDO** desplegar reglas de Firestore (`firestore.rules`) que bloqueen el trabajo activo en campo sin validación previa.

## 1. Convención de Ramas y Entornos

- **`main` (PRODUCCIÓN INTOCABLE):** Conectada al despliegue principal de Vercel usado en campo. **Nunca** hagas commits directos ni fusiones en `main` sin orden explícita del usuario y validación completa en entorno Preview.
- **`feature/user-management-identity` (DESARROLLO ACTIVO):** Rama de trabajo diario donde se estabiliza la gestión de usuarios, autenticación, perfiles, comunidad y compatibilidad con datos históricos.

## 2. Memoria Persistente y Protocolo de Sesión Obligatorio

Estado vivo del proyecto inyectado automáticamente:
@[Estado](docs/proyecto/ESTADO_ACTUAL.md)

### Al INICIAR cualquier sesión:
1. Lee obligatoriamente `docs/proyecto/ESTADO_ACTUAL.md` y `docs/proyecto/ROADMAP.md`.
2. Consulta `docs/proyecto/ARQUITECTURA.md` antes de modificar el esquema de datos, autenticación o reglas de seguridad.
3. Verifica la rama actual con `git status` para confirmar que estás en `feature/user-management-identity`.

### Al CERRAR cualquier sesión:
- Ejecuta siempre el workflow `.agents/workflows/cerrar-sesion.md` (o sigue sus pasos manualmente) para auditar `git diff`, registrar avances en `docs/proyecto/BITACORA.md`, actualizar `docs/proyecto/ROADMAP.md` y reescribir `docs/proyecto/ESTADO_ACTUAL.md`.
