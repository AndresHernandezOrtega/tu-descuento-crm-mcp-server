---
name: mcp-tool-creator
description: >-
  Crea un nuevo tool para este MCP server HTTP streamable de Tu Descuento.
  Úsalo cuando necesites exponer una nueva capacidad de backend/API al agente:
  análisis de endpoint, creación de tipos, servicio, definición del tool,
  handler, registro en tools/index.ts, validación con build y prueba JSON-RPC.
argument-hint: 'Describe: objetivo del tool, endpoint(s), método HTTP, parámetros de entrada y formato de salida esperado.'
---

# MCP Tool Creator

## Objetivo

Diseñar e implementar un nuevo tool MCP en este proyecto siguiendo los patrones reales del repositorio.

El resultado final debe dejar el tool totalmente operativo y accesible por el método `tools/call` en el endpoint HTTP streamable `/mcp`.

## Cuándo usar esta skill

- Cuando se necesita exponer un nuevo endpoint del backend al agente.
- Cuando se va a agregar una nueva interacción con CRM o servicio externo.
- Cuando se requiere mantener consistencia con la arquitectura BaseService + `tools/index.ts`.

## Prerrequisito — documentación del endpoint

Antes de inventar path, params o shapes de respuesta:

1. Usar la skill `crm-endpoint-research` o el subagente `crm-api-researcher`.
2. Fuente canónica: collection Postman **TuDescuento Backend API** (`16285310-a4b62407-4826-48fe-8219-9d614c95b599`).
3. Si Postman MCP responde 401, autenticar con `mcp_auth` antes de continuar.

Para orquestación end-to-end (research + implementación), preferir el subagente `mcp-tool-builder`.

## Contexto técnico del proyecto

- Transporte MCP: HTTP streamable en `src/server.ts` (`POST /mcp`).
- Descubrimiento y ejecución de tools: `src/tools/index.ts`.
- Integración HTTP externa: `src/services/*` extendiendo `BaseService`.
- Contratos de datos: `src/types/entities/*` y export central en `src/types/index.ts`.
- Docs del proyecto: `docs/README.md` (arquitectura en `docs/architecture/ARCHITECTURE.md`).

## Entradas mínimas requeridas

- Nombre del tool (`snake_case`), único y semántico.
- Método y endpoint de backend (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`).
- Parámetros requeridos/opcionales y validaciones.
- Estructura de respuesta esperada (shape real del backend).
- Formato de salida para el agente (JSON directo o texto formateado + JSON).

## Proceso paso a paso

1. Definir contrato funcional del tool.
   - Redactar objetivo: qué resuelve y cuándo debe usarse.
   - Elegir nombre del tool y evitar colisiones con tools existentes.
   - Mapear entradas/salida en lenguaje de negocio para la `description`.

2. Diseñar o ajustar tipos en `src/types/entities`.
   - Si el endpoint devuelve nueva entidad, crear archivo de tipos por entidad.
   - Si ya existe entidad, extender tipos existentes sin romper compatibilidad.
   - Usar fechas como string ISO, no `Date`.
   - Crear wrappers de respuesta (ejemplo: `SomethingResponse`) cuando aplique.

3. Exportar tipos en `src/types/index.ts`.
   - Agregar `export type` de la entidad y wrappers nuevos.
   - Mantener orden y agrupación por dominio del archivo.

4. Crear o extender servicio en `src/services`.
   - Crear archivo nuevo o ampliar uno existente según dominio.
   - Extender `BaseService` y usar `this.get`/`post`/`put`/`patch`/`delete`.
   - Aplicar `buildQueryParams` para filtros opcionales.
   - Limpiar payload de opcionales vacíos cuando aplique (patrón de `lead-service.ts`).
   - Retornar `Promise<ApiResponse<T>>` siempre.

5. Crear el tool en `src/tools/<modulo>/<archivo>.ts`.
   - Definir const Tool con:
     - `name`
     - `description` rica en intención y casos de uso
     - `inputSchema` con `properties` + `required`
   - Implementar handler async:
     - validar argumentos (tipo y presencia)
     - llamar al service
     - manejar error con `isError: true`
     - devolver success con content type `text`
   - En errores, incluir mensaje claro y accionable.

6. Registrar el tool en `src/tools/index.ts`.
   - Agregar import del Tool y del handler.
   - Incluir Tool en el array `tools`.
   - Agregar `case` en `handleToolCall` para delegar al handler correcto.

7. Validar exposición MCP (sin tocar `server.ts` salvo casos excepcionales).
   - Confirmar que `tools/list` incluirá el nuevo tool por estar en el array `tools`.
   - Confirmar que `tools/call` lo enruta por el switch de `handleToolCall`.

8. Verificar calidad técnica.
   - Ejecutar `npm run build`.
   - Probar JSON-RPC `tools/call` contra `POST /mcp` (ver `docs/integrations/POSTMAN_TESTS.md`).
   - Validar respuesta de éxito y de error de validación.

## Decisiones y ramas

- ¿Crear nuevo servicio o extender uno existente?
  - Extender si pertenece al mismo recurso/dominio.
  - Crear nuevo si introduce entidad o bounded context distinto.

- ¿Respuesta JSON directa o texto formateado?
  - JSON directo para consumo estructurado simple.
  - Texto guiado + bloque JSON cuando se necesita narrativa para el agente.

- ¿Validar en schema o en handler?
  - Siempre definir `inputSchema` completo.
  - Repetir validaciones críticas en handler para seguridad defensiva.

- ¿Dónde ubicar el tool?
  - `costumers`: consultas de cliente.
  - `sales`: procesos comerciales/descuentos/membresías/leads.
  - `documentation`: registro y trazabilidad operativa.

## Criterios de completitud

- Tool visible en `tools/list`.
- Tool ejecutable vía `tools/call` sin errores de compilación.
- Tipos centralizados y exportados en `src/types/index.ts`.
- Servicio extiende `BaseService` y retorna `ApiResponse<T>`.
- Handler maneja success/error consistentemente.
- Imports usan alias de tsconfig y extensión `.js` en import paths.
- No se rompieron tools existentes.

## Checklist de implementación

- [ ] Endpoint confirmado vía Postman / `crm-endpoint-research`
- [ ] Tipos nuevos o ajustados en `src/types/entities`
- [ ] Export en `src/types/index.ts`
- [ ] Servicio nuevo/actualizado en `src/services`
- [ ] Tool + handler implementados en `src/tools/...`
- [ ] Registro en `src/tools/index.ts` (imports, array, switch)
- [ ] Build exitoso con `npm run build`
- [ ] Test JSON-RPC manual en `/mcp`

## Prompt sugerido

```
/mcp-tool-creator crear tool para consultar contratos activos de un cliente por
numero_identificacion usando GET /contracts/active-by-identification/{numero_identificacion},
con respuesta resumida y JSON completo.
```
