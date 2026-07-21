---
name: crm-endpoint-research
description: >-
  Investiga endpoints de la API oficial del CRM Tu Descuento Colombia usando el
  MCP de Postman (collection Backend API). Úsalo antes de implementar un tool MCP
  nuevo, cuando necesites path, método HTTP, params, body examples o shape de
  respuesta reales y actualizados.
---

# CRM Endpoint Research

## Objetivo

Obtener la especificación real de un endpoint (o grupo de endpoints) del CRM de Tu Descuento a partir de la collection Postman canónica, para alimentar la implementación segura de tools MCP.

## Cuándo usar

- Antes de crear un tool nuevo (`mcp-tool-creator` / subagente `mcp-tool-builder`).
- Cuando no esté claro el path, método, query/body params o la forma de la respuesta.
- Cuando se sospeche que tipos existentes no coinciden con el backend actual.

## Collection canónica

| Campo | Valor |
| --- | --- |
| Nombre | TuDescuento Backend API |
| Collection ID | `16285310-a4b62407-4826-48fe-8219-9d614c95b599` |
| Workspace | `ec4dff5f-7955-437a-8d34-0d30a1abeea5` |

No inventar paths ni payloads. Si Postman no tiene el request, reportarlo y pedir confirmación al usuario.

## Prerrequisito de autenticación

El MCP `plugin-postman-postman` requiere API key válida.

1. Si `getCollection` / `getCollectionRequest` falla con **401**:
   - Llamar `mcp_auth` en el server `plugin-postman-postman`.
   - Reintentar la consulta.
2. No continuar la implementación del tool sin datos de Postman (salvo que el usuario provea el contrato explícitamente).

## Proceso

1. **Identificar el recurso**
   - Entidad de negocio pedida (cliente, contrato, lead, membresía, etc.).
   - Operación deseada (list, get by id, create, update, filter…).

2. **Mapear la collection**
   - `getCollection` con `collectionId` y `model: "minimal"` (o sin model para el mapa ligero).
   - Localizar folder/request relevantes por nombre o path.

3. **Leer el request concreto**
   - `getCollectionRequest` (o equivalente del MCP) para path, método, headers, query, body.
   - Si hay ejemplos guardados: `getCollectionResponse` / responses del request.
   - Extraer variables de path (`:id`, `{numero_identificacion}`, etc.).

4. **Normalizar el hallazgo** en este formato (devolverlo al llamador):

```markdown
## Endpoint spec

- **name**: <nombre del request Postman>
- **method**: GET|POST|PUT|PATCH|DELETE
- **path**: /api/...
- **auth**: Bearer (TUDESCUENTO_API_KEY) | another
- **pathParams**: ...
- **queryParams**: ... (required/optional)
- **body**: ... (JSON schema / example)
- **successResponse**: ... (example shape)
- **errorNotes**: ...
- **suggestedToolName**: snake_case
- **suggestedModule**: costumers | sales | documentation
- **existingService**: path if reusable, else "new"
```

5. **Cruzar con el repo**
   - Buscar servicios/tools/tipos ya existentes para el mismo dominio.
   - Indicar si conviene extender o crear archivo nuevo.

6. **Entregar al siguiente paso**
   - Pasar el spec a `mcp-tool-creator` o al subagente `mcp-tool-builder`.
   - No implementar código en esta skill salvo que el usuario lo pida explícitamente.

## Tools Postman MCP típicos

Orden sugerido:

1. `getCollection` — mapa de la collection
2. `getCollectionFolder` — explorar folders
3. `getCollectionRequest` — detalle del endpoint
4. `getCollectionResponse` — ejemplos de respuesta (si existen)

Usar `GetMcpTools` / schemas del server antes de llamar herramientas si hay duda de parámetros.

## Anti-patrones

- Inventar campos o status codes "típicos de Laravel" sin evidencia en Postman.
- Usar otra collection (p.ej. la de pruebas MCP del server) como fuente del CRM.
- Continuar con 401 / collection vacía sin avisar al usuario.

## Prompt sugerido

```
/crm-endpoint-research necesito el endpoint para recuperar contratos activos
por numero_identificacion; entregar spec listo para mcp-tool-creator
```
