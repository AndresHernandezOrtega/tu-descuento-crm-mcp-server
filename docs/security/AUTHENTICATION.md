# Autenticación del MCP Server

Este servidor exige un **Bearer token** en todas las peticiones a `/mcp`. El healthcheck `GET /health` permanece público.

## Modelo multi-cliente

Cada consumidor del MCP (n8n, bot de WhatsApp, otro agente) recibe su **propio token**. Los tokens se configuran en la variable de entorno `MCP_AUTH_TOKENS`:

```json
[
  { "name": "n8n-support-agent", "token": "mcp_live_...", "scopes": ["*"] },
  { "name": "whatsapp-sales-bot", "token": "mcp_live_...", "scopes": ["*"] }
]
```

Reglas al arrancar:

- JSON válido, array no vacío
- `name` único por cliente
- `token` único y con longitud ≥ 32 caracteres
- Los tokens se indexan por SHA-256; la comparación usa `timingSafeEqual`

## Emitir un token

```bash
npm run gen:token -- --name n8n-support-agent
```

Copia la entrada JSON generada dentro del array de `MCP_AUTH_TOKENS` en `.env` / docker-compose.

## Header requerido

```http
Authorization: Bearer mcp_live_...
```

### n8n MCP Client

```yaml
Transport Type: Streamable HTTP
Base URL: https://mcp.tudescuento.com.co/mcp
Headers:
  - Name: Authorization
    Value: Bearer mcp_live_TU_TOKEN
```

### curl

```bash
curl -s http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp_live_TU_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

## Respuestas de error

| Situación | HTTP | Código JSON-RPC | Notas |
|-----------|------|-----------------|-------|
| Sin header / token inválido | 401 | -32001 | Incluye `WWW-Authenticate: Bearer realm="mcp"` |
| Sesión de otro cliente | 403 | -32003 | Impide secuestro de `Mcp-Session-Id` |
| Rate limit excedido | 429 | -32000 | Header `Retry-After` (segundos) |

Rate limit por cliente: `MCP_RATE_LIMIT_PER_MINUTE` (default 120).

## Vinculación de sesión

Al hacer `initialize`, la sesión (`Mcp-Session-Id`) queda ligada al `name` del cliente autenticado. Cualquier request posterior con esa sesión y un token de otro cliente recibe **403**.

## Rotación

1. Genera un token nuevo para el cliente
2. Añádelo a `MCP_AUTH_TOKENS` (puedes mantener el viejo temporalmente)
3. Actualiza el consumidor (n8n, etc.)
4. Elimina el token antiguo y reinicia el servidor

Nunca reutilices el mismo token entre dos clientes distintos.
