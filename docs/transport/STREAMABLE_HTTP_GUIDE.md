# Guía de Transporte Streamable HTTP

## Descripción General

El servidor MCP de Tu Descuento Colombia utiliza **Streamable HTTP** (HTTP con Chunked Transfer Encoding) como método de transporte. Este es el transporte estándar recomendado por MCP y compatible con la mayoría de clientes MCP, incluyendo el nodo MCP Client de n8n.

## ¿Qué es Streamable HTTP?

Streamable HTTP permite comunicación bidireccional usando una única conexión HTTP POST:

1. **Cliente** → Envía petición POST a `/mcp` con mensaje JSON-RPC
2. **Servidor** → Responde en la misma conexión usando `Transfer-Encoding: chunked`
3. **Conexión** → Se cierra después de procesar todos los mensajes

### Características

- ✅ **Una sola conexión**: No requiere mantener dos conexiones (GET/POST)
- ✅ **Streaming**: Respuestas enviadas incrementalmente con chunked encoding
- ✅ **Batch support**: Soporta múltiples mensajes en una petición (separados por newline)
- ✅ **Estándar MCP**: Compatible con especificación MCP 2024-11-05
- ✅ **Compatible n8n**: Funciona directamente con n8n MCP Client

## Endpoints

### POST /mcp

Endpoint principal para todas las operaciones MCP.

**Headers:**

```
Content-Type: application/json
mcp-session-id: <uuid> (opcional, se genera automáticamente si no se proporciona)
```

**Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response Headers:**

```
Content-Type: application/json
Transfer-Encoding: chunked
Connection: keep-alive
Cache-Control: no-cache
```

**Response Body:**

```json
{"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

## Métodos JSON-RPC Soportados

### 1. initialize

Inicializa una sesión MCP y obtiene las capacidades del servidor.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "mi-cliente",
      "version": "1.0.0"
    }
  }
}
```

**Respuesta:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "tudescuento-mcp-server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {}
    }
  }
}
```

### 2. tools/list

Lista todas las herramientas disponibles.

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### 3. tools/call

Ejecuta una herramienta específica.

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_memberships",
    "arguments": {}
  }
}
```

### 4. prompts/list

Lista todos los prompts disponibles.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "prompts/list"
}
```

### 5. resources/list

Lista todos los recursos disponibles.

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/list"
}
```

## Uso con n8n

### Configuración del Nodo MCP Client

1. **Transport Type**: Seleccionar `Streamable HTTP`
2. **URL**: `http://localhost:3000/mcp` (o la URL de producción)
3. **Headers** (opcional):
   - `mcp-session-id`: UUID para mantener sesión entre peticiones

### Ejemplo de Flujo n8n

1. **Nodo HTTP Request** (POST a `/mcp`):

   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "initialize",
     "params": {
       "protocolVersion": "2024-11-05",
       "clientInfo": { "name": "n8n", "version": "1.0.0" }
     }
   }
   ```

2. **Nodo MCP Client** (conectar directamente):
   - URL: `http://localhost:3000/mcp`
   - Transport: `Streamable HTTP`
   - El nodo maneja automáticamente la comunicación

## Uso con curl

### Ejemplo básico

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"curl","version":"1.0.0"}}}'
```

### Ejemplo con sesión

```bash
# Obtener membresías
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: 12345678-1234-1234-1234-123456789abc" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_memberships","arguments":{}}}'
```

## Uso con PowerShell

```powershell
# Initialize
$body = @{
    jsonrpc = "2.0"
    id = 1
    method = "initialize"
    params = @{
        protocolVersion = "2024-11-05"
        clientInfo = @{
            name = "powershell"
            version = "1.0.0"
        }
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/mcp" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing

# Tools/list
$body = '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
Invoke-WebRequest -Uri "http://localhost:3000/mcp" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing
```

## Mensajes Batch (Múltiples mensajes en una petición)

Puedes enviar múltiples mensajes JSON-RPC en una sola petición separándolos con newline:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"method":"prompts/list"}'
```

El servidor procesará cada mensaje y devolverá las respuestas correspondientes.

## Gestión de Sesiones

- Cada conexión puede incluir un header `mcp-session-id`
- Si no se proporciona, el servidor genera uno automáticamente
- Las sesiones se mantienen entre peticiones con el mismo `session-id`
- Las sesiones se limpian cuando el cliente se desconecta

## Manejo de Errores

### Error de método no encontrado

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found: invalid_method"
  }
}
```

### Error interno

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Error details..."
  }
}
```

## Monitoreo

### Health Check

```bash
curl http://localhost:3000/health
```

**Respuesta:**

```json
{
  "status": "ok",
  "server": "tudescuento-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-02-18T10:30:00.000Z",
  "activeSessions": 2
}
```

## Logs del Servidor

El servidor muestra información detallada de cada petición:

```
🔗 Cliente HTTP Streamable conectado (sesión abc-123...)
📝 Nueva sesión MCP: abc-123...
📨 Recibidos 1 mensaje(s) (sesión abc-123...)
   → Procesando: initialize
   ✅ Respuesta enviada: initialize
🔌 Cliente desconectado (sesión abc-123...)
```

## Diferencias con HTTP+SSE (Método Anterior)

| Característica | HTTP+SSE (Antiguo) | Streamable HTTP (Nuevo)   |
| -------------- | ------------------ | ------------------------- |
| Conexiones     | 2 (GET + POST)     | 1 (POST)                  |
| Streaming      | Server-Sent Events | Chunked Transfer Encoding |
| Compatibilidad | Limitada           | Estándar MCP              |
| Complejidad    | Alta               | Baja                      |
| n8n Support    | No directo         | ✅ Nativo                 |

## Troubleshooting

### La conexión se queda esperando

**Problema**: El cliente no recibe respuesta.

**Solución**: Verifica que el servidor haya terminado de procesar el mensaje. Revisa los logs del servidor.

### Error de JSON parsing

**Problema**: `Invalid JSON primitive`

**Solución**: Asegúrate de enviar JSON-RPC válido y que el `Content-Type` sea `application/json`.

### Sesión no encontrada

**Problema**: El servidor no reconoce la sesión.

**Solución**: Las sesiones se limpian al desconectarse. Usa el mismo `mcp-session-id` para mantener la sesión entre peticiones.

## Próximos Pasos

1. Integrar con n8n usando el nodo MCP Client
2. Configurar autenticación si es necesario
3. Implementar rate limiting para producción
4. Configurar HTTPS para conexiones seguras

## Referencias

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [n8n MCP Client Documentation](https://docs.n8n.io)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
