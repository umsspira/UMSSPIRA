# [epic02-grupo07-hu19] Proyectos y portafolio

**Épica:** Perfil de egresado · **Prefijo:** `/api/v1/perfil`
**Éxito:** `{ "data": ... }`. **Error:** `{ "error": { "code": "CODIGO", "message": "..." } }`; validación agrega `fields`.

## Endpoints

- `GET /api/v1/perfil/proyectos`: proyectos propios, del más reciente al más antiguo.
- `POST /api/v1/perfil/proyectos`: agregar proyecto (201).
- `PUT /api/v1/perfil/proyectos/:id`: reemplazar los datos del proyecto.
- `DELETE /api/v1/perfil/proyectos/:id`: eliminar proyecto (204).

## Autenticación y dueño

Igual que el resto del perfil: lecturas con `perfil:self:read` y escrituras con `perfil:self:write`. El titulado sale de la sesión (`scopes.graduateId`); el cuerpo no acepta `idTitulado`. Editar o eliminar un proyecto de otro titulado responde 403 `PROFILE_RECORD_FORBIDDEN`; un id que no existe responde 404 `PROFILE_RECORD_NOT_FOUND`.

## Cuerpo de POST y PUT

```json
{
  "nombre": "Sistema de inventario",
  "url": "https://github.com/ana/inventario",
  "descripcion": "Aplicación web para el control de stock"
}
```

- `nombre`: obligatorio, hasta 150 caracteres.
- `url`: obligatoria, debe empezar con `https://` y poder leerse con `new URL`. Si no, 400 con el mensaje «Ingresa una dirección https válida».
- `descripcion`: opcional (o `null`), hasta 300 caracteres.

## Respuesta

```json
{
  "data": {
    "id": "uuid",
    "idTitulado": "uuid",
    "nombre": "Sistema de inventario",
    "url": "https://github.com/ana/inventario",
    "descripcion": null,
    "fechaCreacion": "2026-11-11T20:00:00.000Z",
    "fechaActualizacion": null
  }
}
```

`GET` devuelve `data` como lista de estos objetos.

## Base de datos

Migración `20261111180000_proyecto_titulado`: crea la tabla `proyecto` (FK a `titulado` con borrado en cascada, índice por titulado y fecha, CHECK de `https://`, RLS sin acceso de `anon`/`authenticated`). Es aditiva y no toca datos existentes. La aplica el líder de BD.
