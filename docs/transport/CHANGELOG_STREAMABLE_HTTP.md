# Changelog: Migración a Transporte Streamable HTTP

## Fecha: 18 de Febrero de 2026

## Resumen

Se completó la migración del transporte HTTP+SSE (dos conexiones: GET para SSE + POST para comandos) al transporte **Streamable HTTP** (una sola conexión POST con chunked transfer encoding), siguiendo las especificaciones estándar de MCP y garantizando compatibilidad con n8n MCP Client.

## Cambios Realizados

### 1. Refactorización del Servidor (`src/server.ts`)

#### Eliminado:

- ❌ Map `sseConnections` para almacenar conexiones SSE
- ❌ Método `sendSSEResponse()` para enviar eventos SSE
- ❌ Endpoint `GET /mcp` para establecer conexión SSE
- ❌ Keep-alive pings cada 15 segundos
- ❌ Lógica de respuestas asíncronas con 202 Accepted

#### Agregado:

- ✅ Método `processMessage()` para procesar mensajes JSON-RPC síncronamente
- ✅ Endpoint `POST /mcp` refactorizado con streaming usando `Transfer-Encoding: chunked`
- ✅ Soporte para múltiples mensajes en una petición (batch processing)
- ✅ Middleware `express.text()` para parsear body raw
- ✅ Headers optimizados para streaming HTTP

#### Cambios en Logs:

```
Antes: "HTTP+SSE (Server-Sent Events)"
Ahora: "Streamable HTTP (Chunked Transfer Encoding)"

Antes: "📡 MCP endpoint GET (SSE): http://localhost:3000/mcp"
       "📡 MCP endpoint POST: http://localhost:3000/mcp"
Ahora: "📡 MCP endpoint: http://localhost:3000/mcp"
```

### 2. Documentación Actualizada

#### Nuevo Archivo Creado:

- ✅ `STREAMABLE_HTTP_GUIDE.md` - Guía completa del transporte Streamable HTTP
  - Descripción técnica del transporte
  - Ejemplos con curl, PowerShell, n8n
  - Manejo de errores
  - Monitoreo y troubleshooting

#### Archivos Actualizados:

- ✅ `N8N_CONNECTION_GUIDE.md`
  - Flujo de comunicación actualizado (ya no muestra GET+POST)
  - Configuración de Transport Type: `Streamable HTTP`
  - URLs actualizadas (incluyen `/mcp` directamente)
  - Logs actualizados
  - Troubleshooting actualizado

- ✅ `README.md`
  - Características: "Transporte Streamable HTTP"
  - Endpoints: documentado `POST /mcp`
  - Integración n8n: uso del nodo MCP Client con Streamable HTTP

### 3. Flujo de Comunicación

#### Antes (HTTP+SSE):

```
1. Cliente → GET /mcp (establecer SSE)
2. Servidor → event: connected + sessionId
3. Cliente → POST /mcp (enviar comando)
4. Servidor → HTTP 202 Accepted
5. Servidor → SSE: event: message (respuesta asíncrona)
6. Keep-alive pings cada 15s
```

#### Ahora (Streamable HTTP):

```
1. Cliente → POST /mcp (enviar mensaje JSON-RPC)
2. Servidor → HTTP 200 OK con Transfer-Encoding: chunked
3. Servidor → Respuesta JSON-RPC en el mismo stream
4. Servidor cierra conexión
```

### 4. Compatibilidad

#### Compatible con:

- ✅ n8n MCP Client (transporte Streamable HTTP)
- ✅ curl / HTTP clients estándar
- ✅ Especificación MCP 2024-11-05
- ✅ Batch requests (múltiples mensajes por petición)

#### No compatible con:

- ❌ Clientes que esperan HTTP+SSE (dos conexiones)
- ❌ Clientes que esperan eventos SSE

### 5. Testing Realizado

Se verificó el funcionamiento con PowerShell:

```powershell
# ✅ Initialize - OK
POST /mcp → {"jsonrpc":"2.0","id":1,"method":"initialize",...}
Response: {"jsonrpc":"2.0","id":1,"result":{...}}

# ✅ Tools/list - OK
POST /mcp → {"jsonrpc":"2.0","id":2,"method":"tools/list"}
Response: {"jsonrpc":"2.0","id":2,"result":{"tools":[...]}}

# ✅ Tools/call - OK
POST /mcp → {"jsonrpc":"2.0","id":3,"method":"tools/call",...}
Response: {"jsonrpc":"2.0","id":3,"result":{...}}
```

## Ventajas del Cambio

1. **Simplicidad**: Una sola conexión HTTP POST vs dos conexiones (GET+POST)
2. **Estándar MCP**: Sigue la especificación oficial de MCP
3. **Compatibilidad**: Funciona con nodos MCP Client estándar en n8n
4. **Rendimiento**: No necesita mantener conexiones largas con keep-alive
5. **Debugging**: Más fácil de probar con herramientas HTTP estándar
6. **Infraestructura**: No requiere configuración especial de proxies para SSE

## Próximos Pasos

1. ✅ Código refactorizado y testeado
2. ✅ Documentación actualizada
3. ⏳ Desplegar en Docker producción
4. ⏳ Probar integración con n8n en producción
5. ⏳ Actualizar guías de deployment si es necesario

## Notas Técnicas

- **Middleware**: Cambiado de `express.json()` a `express.text()` para permitir parseo manual de múltiples mensajes
- **Headers**: Agregado `Transfer-Encoding: chunked` para streaming HTTP estándar
- **Sesiones**: Se mantiene soporte para `mcp-session-id` header (opcional)
- **Errores**: Manejo de errores JSON-RPC estándar (códigos -32601, -32603, etc.)

## Referencias

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [STREAMABLE_HTTP_GUIDE.md](STREAMABLE_HTTP_GUIDE.md)
- [N8N_CONNECTION_GUIDE.md](N8N_CONNECTION_GUIDE.md)
