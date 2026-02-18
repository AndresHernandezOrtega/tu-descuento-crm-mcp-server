# 🚀 Guía de Despliegue en Producción

## Pre-requisitos

- [x] Docker y Docker Compose instalados
- [x] Acceso a servidor de producción (con permisos sudo)
- [x] Variables de entorno configuradas
- [x] Credenciales de API de Tu Descuento (producción)

## 📋 Checklist de Despliegue

### 1. Preparar Variables de Entorno

```bash
# Copiar template de producción
cp .env.production.example .env.production

# Editar con valores reales
nano .env.production
```

**Variables críticas a configurar:**

- ✅ `TUDESCUENTO_API_URL` - URL real de producción
- ✅ `TUDESCUENTO_API_KEY` - API Key de producción (NO desarrollo)
- ✅ `CORS_ORIGINS` - Dominios específicos (NUNCA usar `*`)
- ✅ `LOG_LEVEL=info` (NO usar `debug` en producción)

### 2. Construir Imagen Docker

```bash
# Opción A: Build simple
docker build -t tudescuento-mcp-server:latest .

# Opción B: Build con tag de versión
docker build -t tudescuento-mcp-server:1.0.0 .
```

### 3. Verificar Build

```bash
# Ver imágenes creadas
docker images | grep tudescuento-mcp-server

# Inspeccionar capas
docker history tudescuento-mcp-server:latest
```

### 4. Desplegar con Docker Compose

```bash
# Iniciar servicios (detached mode)
docker-compose --env-file .env.production up -d

# Ver logs
docker-compose logs -f mcp-server

# Ver estado
docker-compose ps
```

### 5. Verificar Salud del Servicio

```bash
# Healthcheck endpoint
curl http://localhost:3000/health

# Debería responder:
# {"status":"ok","timestamp":"2026-02-18T07:30:00.000Z"}

# Verificar tools disponibles
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

### 6. Monitoreo

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver uso de recursos
docker stats tudescuento-mcp-server

# Ver healthcheck status
docker inspect --format='{{.State.Health.Status}}' tudescuento-mcp-server
```

## 🔒 Seguridad en Producción

### Checklist de Seguridad

- [ ] **API Key segura**: No exponer en logs ni en código
- [ ] **CORS configurado**: Solo dominios específicos permitidos
- [ ] **HTTPS**: Servidor detrás de proxy reverse (Nginx/Traefik)
- [ ] **Usuario no-root**: Verificar que corre como `nodejs:1001`
- [ ] **Firewall**: Solo exponer puerto 3000 al proxy reverse
- [ ] **Secrets management**: Considerar Docker secrets o vault
- [ ] **Rate limiting**: Implementar en proxy reverse
- [ ] **Logs sensibles**: No logear API keys ni datos personales

### Configurar Proxy Reverse (Nginx)

```nginx
server {
    listen 80;
    server_name mcp.tudescuento.com.co;

    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.tudescuento.com.co;

    ssl_certificate /etc/letsencrypt/live/mcp.tudescuento.com.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.tudescuento.com.co/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=mcp_limit burst=10 nodelay;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

## 📊 Monitoreo y Alertas

### Logs Persistentes

Los logs se guardan en un volumen Docker:

```bash
# Ver ubicación del volumen
docker volume inspect mcp-server-ai-agent_logs

# Acceder a logs
docker run --rm -v mcp-server-ai-agent_logs:/logs alpine ls -lah /logs
```

### Healthcheck Monitoring

Configurar monitoreo externo (UptimeRobot, Pingdom, etc.) para:

- URL: `https://mcp.tudescuento.com.co/health`
- Intervalo: 5 minutos
- Alerta si: Status != 200

## 🔄 Actualización y Rollback

### Actualizar a Nueva Versión

```bash
# 1. Pull nueva versión del código
git pull origin main

# 2. Rebuild imagen
docker-compose build

# 3. Recrear contenedor (sin downtime)
docker-compose up -d --force-recreate

# 4. Verificar logs
docker-compose logs -f mcp-server
```

### Rollback en Caso de Error

```bash
# Detener versión actual
docker-compose down

# Volver a versión anterior (ejemplo: 1.0.0)
docker run -d \
  --name tudescuento-mcp-server \
  --env-file .env.production \
  -p 3000:3000 \
  tudescuento-mcp-server:1.0.0

# Verificar
curl http://localhost:3000/health
```

## 🛠️ Troubleshooting

### Container no inicia

```bash
# Ver logs completos
docker-compose logs mcp-server

# Verificar variables de entorno
docker inspect tudescuento-mcp-server | grep -A 20 Env

# Revisar red
docker network inspect mcp-server-ai-agent_tudescuento-network
```

### Error 404 en API

- [ ] Verificar `TUDESCUENTO_API_URL` en `.env.production`
- [ ] Verificar `TUDESCUENTO_API_KEY` es válida
- [ ] Verificar conectividad de red: `docker exec tudescuento-mcp-server ping api.tudescuento.com.co`

### CORS Errors

- [ ] Verificar `CORS_ORIGINS` incluye el dominio correcto
- [ ] Verificar que el frontend usa HTTPS (si backend usa HTTPS)

## 📈 Escalado

### Docker Swarm (Alta Disponibilidad)

```bash
# Convertir a stack de Swarm
docker stack deploy -c docker-compose.yml tudescuento-mcp

# Escalar a 3 réplicas
docker service scale tudescuento-mcp_mcp-server=3
```

### Kubernetes (Opcional)

Ver archivo `k8s/deployment.yaml` (crear si es necesario)

## 🔗 Enlaces Útiles

- [Documentación MCP](https://modelcontextprotocol.io)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Checklist](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 📞 Soporte

En caso de problemas en producción:

1. Revisar logs: `docker-compose logs -f`
2. Verificar healthcheck: `curl http://localhost:3000/health`
3. Contactar equipo de desarrollo con logs completos
