---
description: Revisa los cambios de la sesión (git diff/status), actualiza BITACORA.md y ROADMAP.md, y reescribe ESTADO_ACTUAL.md antes de cerrar la sesión de trabajo.
---

# Workflow: Cerrar Sesión de Trabajo

Ejecuta este procedimiento al finalizar cada sesión de desarrollo para mantener sincronizada la memoria persistente del proyecto:

1. **Inspeccionar el estado del repositorio:**
   - Ejecuta `git status` y `git diff --stat` (además de `git log -n 5 --oneline`) para identificar todos los archivos creados, modificados o confirmados durante la sesión.
   - Verifica que no queden archivos temporales, logs de depuración (`firebase-debug.log`) ni credenciales expuestas sin ignorar en `.gitignore`.

2. **Actualizar `docs/proyecto/ROADMAP.md`:**
   - Marca como completadas (`[x]`) las tareas finalizadas y verificadas en la sesión.
   - Añade nuevas tareas descubiertas durante el desarrollo en la fase correspondiente.

3. **Registrar entrada en `docs/proyecto/BITACORA.md`:**
   - Añade una nueva sección al principio del historial con la fecha actual (`## [YYYY-MM-DD] — Título breve de la sesión`).
   - Documenta de forma concisa:
     - Cambios implementados y archivos afectados.
     - Decisiones técnicas o cambios en el modelo de datos/reglas de Firebase.
     - Pruebas ejecutadas y su resultado.

4. **Reescribir `docs/proyecto/ESTADO_ACTUAL.md`:**
   - Actualiza la fecha y la foto exacta del estado de la rama activa (`feature/user-management-identity` o `main`).
   - Refleja qué módulos están listos, qué bloqueos quedan activos y cuál es el **Siguiente Paso Inmediato** para el próximo agente que inicie sesión.
