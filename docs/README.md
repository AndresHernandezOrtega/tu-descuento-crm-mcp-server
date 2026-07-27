# Documentación — MCP Server Tu Descuento

Índice de la documentación del proyecto. El `README.md` de la raíz cubre instalación y uso rápido; aquí vive el detalle técnico.

## Arquitectura

- [ARCHITECTURE.md](architecture/ARCHITECTURE.md) — Patrones de services, types, tools, prompts y resources

## Despliegue

- [DEPLOYMENT.md](deployment/DEPLOYMENT.md) — Guía completa de despliegue
- [DOCKER_QUICK_START.md](deployment/DOCKER_QUICK_START.md) — Arranque rápido con Docker

## Transporte MCP

- [STREAMABLE_HTTP_GUIDE.md](transport/STREAMABLE_HTTP_GUIDE.md) — Guía del transporte Streamable HTTP
- [CHANGELOG_STREAMABLE_HTTP.md](transport/CHANGELOG_STREAMABLE_HTTP.md) — Changelog del transporte

## Seguridad

- [AUTHENTICATION.md](security/AUTHENTICATION.md) — Bearer tokens multi-cliente, rate limit y sesiones

## Integraciones

- [N8N_CONNECTION_GUIDE.md](integrations/N8N_CONNECTION_GUIDE.md) — Conexión con n8n (MCP Client)
- [POSTMAN_TESTS.md](integrations/POSTMAN_TESTS.md) — Ejemplos JSON-RPC para probar tools
- [POSTMAN_MCP_GUIDE.md](integrations/POSTMAN_MCP_GUIDE.md) — Guía Postman + MCP

## API / Capacidades del servicio

Documentación generada o actualizada por el subagente `service-documenter` a partir de collections Postman:

- Carpeta [api/](api/) — Recursos, tools, prompts y ejemplos de request del MCP server
