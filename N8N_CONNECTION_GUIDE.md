# 🔌 Guía de Conexión con n8n MCP Client

Esta guía explica cómo conectar el servidor MCP de Tu Descuento con n8n usando el nodo **MCP Client** con transporte **Streamable HTTP**.

## 📋 Requisitos Previos

1. ✅ Servidor MCP corriendo y accesible
2. ✅ n8n con el nodo **MCP Client** disponible
3. ✅ Conexión de red entre n8n y el servidor MCP

## 🔄 Flujo de Comunicación Streamable HTTP

```
┌─────────┐                    ┌──────────────┐
│   n8n   │                    │  MCP Server  │
└────┬────┘                    └──────┬───────┘
     │                                │
     │ POST /mcp                      │
     │ Body: JSON-RPC request         │
     │──────────────────────────────>│
     │                                │
     │ HTTP 200 OK                    │
     │ Transfer-Encoding: chunked     │
     │ Body: JSON-RPC response        │
     │<──────────────────────────────│
     │                                │
     │ Connection closes              │
     └────────────────────────────────┘
```

**Características:**

- ✅ Una sola conexión HTTP POST
- ✅ Respuestas enviadas con chunked transfer encoding
- ✅ Conexión se cierra después de la respuesta
- ✅ Soporte para múltiples mensajes en una petición (batch)

## ⚙️ Configuración en n8n

### Paso 1: Agregar Nodo MCP Client

1. En tu workflow de n8n, agrega el nodo **MCP Client**
2. Configura los siguientes parámetros:

### Paso 2: Configuración del Transporte

```yaml
Transport Type: Streamable HTTP
Base URL: http://tu-servidor:3000/mcp
```

**Ejemplo con servidor local:**

```yaml
Transport Type: Streamable HTTP
Base URL: http://localhost:3000/mcp
```

**Ejemplo con servidor en producción:**

```yaml
Transport Type: Streamable HTTP
Base URL: https://mcp.tudescuento.com.co/mcp
```

### Paso 3: Headers (Opcionales)

Si necesitas configurar headers adicionales:

```yaml
Headers:
  - Name: Authorization
    Value: Bearer tu_token_aqui (si aplica)
```

**Nota:** El header `mcp-session-id` se maneja automáticamente por el protocolo.

### Paso 4: Verificar Conexión

1. Ejecuta el workflow en n8n
2. El nodo debería:
   - ✅ Establecer conexión SSE (GET /mcp)
   - ✅ Recibir el `sessionId`
   - ✅ Estar listo para enviar comandos

## 🛠️ Comandos Disponibles

Una vez conectado, puedes usar cualquiera de estos comandos MCP:

### 1. Listar Tools Disponibles

```json
{
  "method": "tools/list",
  "params": {}
}
```

**Respuesta esperada (por SSE):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_costumer_by_identification",
        "description": "Obtiene información de un cliente por su número de identificación",
        "inputSchema": { ... }
      },
      {
        "name": "get_public_memberships",
        "description": "Obtiene todas las membresías disponibles para venta pública",
        "inputSchema": { ... }
      },
      ...
    ]
  }
}
```

### 2. Ejecutar un Tool

**Ejemplo: Consultar membresías**

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_public_memberships",
    "arguments": {}
  }
}
```

**Ejemplo: Buscar cliente**

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_costumer_by_identification",
    "arguments": {
      "numero_identificacion": "93408335"
    }
  }
}
```

**Respuesta esperada (streaming):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Se encontraron 4 membresía(s) disponible(s) para venta:\n\n..."
      }
    ]
  }
}
```

### 3. Listar Prompts

```json
{
  "method": "prompts/list",
  "params": {}
}
```

### 4. Listar Resources

```json
{
  "method": "resources/list",
  "params": {}
}
```

## 📊 Monitoreo de Conexión

### Verificar Estado del Servidor

```bash
curl http://localhost:3000/health
```

**Respuesta:**

```json
{
  "status": "ok",
  "server": "tudescuento-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-02-18T12:00:00.000Z",
  "activeSessions": 1
}
```

### Ver Logs del Servidor

Los logs mostrarán:

```
🔗 Cliente HTTP Streamable conectado (sesión uuid-aqui)
📝 Nueva sesión MCP: uuid-aqui
📨 Recibidos 1 mensaje(s) (sesión uuid-aqui)
   → Procesando: tools/list
   ✅ Respuesta enviada: tools/list
```

## 🐛 Troubleshooting

### ❌ Error: "Connection refused" o "Timeout"

**Causa:** El servidor MCP no está accesible desde n8n.

**Solución:**

1. Verificar que el nodo MCP Client está configurado con transporte **Streamable HTTP**
2. Verificar que la URL es correcta (ej: `http://localhost:3000/mcp`)
3. Reiniciar el workflow en n8n para establecer nueva conexión

### ❌ Error: "Connection timeout"

**Causa:** El servidor MCP no es accesible desde n8n.

**Solución:**

1. Verificar que el servidor está corriendo: `curl http://localhost:3000/health`
2. Verificar firewall y reglas de red
3. Si usas Docker, verificar que el puerto está expuesto

### ❌ Error: "CORS policy"

**Causa:** El servidor rechaza la conexión por políticas CORS.

**Solución:** Configurar `CORS_ORIGINS` en el archivo `.env`:

```bash
CORS_ORIGINS=https://tu-n8n-instance.com
```

Reiniciar servidor:

```bash
docker-compose restart mcp-server
```

### ⚠️ Respuestas lentas

**Causa:** API externa tarda en responder o problemas de red.

**Solución:**

1. Verificar logs del servidor para identificar cuál tool está siendo lento
2. Configurar timeout en el proxy (Nginx) si aplica:

```nginx
location /mcp {
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
}
```

## 📝 Ejemplo Completo en n8n

### Workflow: Consultar Membresías

```yaml
Nodes:
  1. Trigger (Manual)
  2. MCP Client
     - Transport: Streamable HTTP
     - URL: http://localhost:3000/mcp
     - Method: tools/call
     - Tool Name: get_public_memberships
     - Arguments: {}
  3. Code (Procesar Respuesta)
     - Extraer datos de membresías
     - Formatear para presentación
```

### Workflow: Búsqueda de Cliente

```yaml
Nodes:
  1. Webhook (Trigger)
     - Path: /search-customer
     - Method: POST
  2. Set Variable
     - identificacion: {{$json.body.id}}
  3. MCP Client
     - Transport: Streamable HTTP
     - URL: http://localhost:3000/mcp
     - Method: tools/call
     - Tool Name: get_costumer_by_identification
     - Arguments:
         numero_identificacion: {{$node["Set Variable"].json.identificacion}}
  4. Respond to Webhook
     - Response: {{$json}}
```

## 🔗 Referencias

- [Documentación MCP Protocol](https://modelcontextprotocol.io)
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitectura del servidor
- [README.md](README.md) - Configuración general

## 🆘 Soporte

Si encuentras problemas:

1. Revisar logs del servidor: `docker-compose logs -f mcp-server`
2. Verificar healthcheck: `curl http://localhost:3000/health`
3. Verificar conexiones activas en logs: buscar "Cliente HTTP Streamable conectado"
4. Probar manualmente con curl: `curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
5. Contactar equipo de desarrollo con logs completos
