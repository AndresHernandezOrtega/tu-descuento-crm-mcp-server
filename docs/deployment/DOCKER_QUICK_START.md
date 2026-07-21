# 🐳 Docker Deployment - Guía Rápida

## ⚠️ Problema Común: Container se Reinicia Constantemente

Si ves este error en los logs:

```
[dotenv] injecting env (0) from .env
❌ ERROR: Variables de entorno requeridas no encontradas:
   - TUDESCUENTO_API_URL
   - TUDESCUENTO_API_KEY
```

**Causa:** Las variables de entorno NO están configuradas en el host.

## ✅ Solución: Configurar Variables de Entorno

### Opción 1: Usar archivo .env en el host (RECOMENDADA)

```bash
# 1. En el directorio del proyecto (donde está docker-compose.yml)
cp .env.docker.example .env

# 2. Editar .env con tus valores reales
nano .env

# 3. Asegurarte que contenga (como mínimo):
TUDESCUENTO_API_URL=https://tu-api-real.com
TUDESCUENTO_API_KEY=tu_api_key_real_aqui

# 4. Iniciar con docker-compose
docker-compose up -d

# 5. Verificar logs
docker-compose logs -f
```

### Opción 2: Variables de entorno del sistema

```bash
# Exportar variables antes de docker-compose
export TUDESCUENTO_API_URL=https://tu-api-real.com
export TUDESCUENTO_API_KEY=tu_api_key_real_aqui

# Iniciar
docker-compose up -d
```

### Opción 3: Pasar variables inline

```bash
TUDESCUENTO_API_URL=https://tu-api-real.com \
TUDESCUENTO_API_KEY=tu_api_key_real \
docker-compose up -d
```

## 📋 Variables Requeridas (OBLIGATORIAS)

```bash
TUDESCUENTO_API_URL=https://api.tudescuento.com.co  # URL de tu API
TUDESCUENTO_API_KEY=your_key                         # API Key de producción
```

## 📋 Variables Opcionales

```bash
PORT=3000                                            # Puerto del host
LOG_LEVEL=info                                       # Nivel de logs
CORS_ORIGINS=https://tu-dominio.com                  # Dominios permitidos
MCP_SERVER_NAME=tudescuento-mcp-server               # Nombre del servidor
MCP_SERVER_VERSION=1.0.0                             # Versión
```

## 🔍 Verificar Configuración

```bash
# Ver variables que docker-compose pasará al contenedor
docker-compose config

# Debe mostrar los valores reales (no ${VARIABLE})
environment:
  - TUDESCUENTO_API_URL=https://api.tudescuento.com.co  ✅
  - TUDESCUENTO_API_KEY=abc123...                        ✅

# NO debe mostrar:
  - TUDESCUENTO_API_URL=                                 ❌
  - TUDESCUENTO_API_KEY=${TUDESCUENTO_API_KEY}           ❌
```

## 🚀 Despliegue Completo

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd mcp-server-ai-agent

# 2. Configurar variables
cp .env.docker.example .env
nano .env  # Editar con valores reales

# 3. Build y start
docker-compose up -d --build

# 4. Verificar salud
curl http://localhost:3000/health
# Debe responder: {"status":"ok","timestamp":"..."}

# 5. Ver logs (debe mostrar configuración cargada)
docker-compose logs -f mcp-server
```

## ✅ Logs Correctos (Funcionando)

```
⚙️  Configuración cargada:
   PORT: 3000
   API_URL: https://api.tudescuento.com.co
   API_KEY: prod_abc12...
   CORS_ORIGINS: https://n8n.tudescuento.com.co
🚀 MCP Server iniciado en puerto 3000
```

## ❌ Logs Incorrectos (Falta Configuración)

```
[dotenv] injecting env (0) from .env
❌ ERROR: Variables de entorno requeridas no encontradas:
   - TUDESCUENTO_API_URL
   - TUDESCUENTO_API_KEY
   
← Container se reinicia constantemente
```

## 🔧 Troubleshooting

### Problema: Variables no se cargan

```bash
# Verificar que .env existe en el directorio correcto
ls -la .env

# Verificar contenido
cat .env

# Verificar que docker-compose lee las variables
docker-compose config | grep TUDESCUENTO
```

### Problema: Container se reinicia

```bash
# Ver logs completos
docker-compose logs --tail=100 mcp-server

# Si muestra error de variables faltantes:
# → Configurar .env correctamente

# Si muestra error de conexión API:
# → Verificar TUDESCUENTO_API_URL es accesible
docker exec tudescuento-mcp-server wget -O- $TUDESCUENTO_API_URL
```

### Problema: Healthcheck falla

```bash
# Verificar healthcheck
docker inspect tudescuento-mcp-server | grep -A 10 Health

# Test manual del endpoint
docker exec tudescuento-mcp-server wget -O- http://localhost:3000/health
```

## 📚 Referencias

- [docker-compose.yml](docker-compose.yml) - Configuración del servicio
- [.env.docker.example](.env.docker.example) - Template de variables
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía completa de despliegue

## 🔐 Seguridad

1. ✅ NUNCA subir archivo `.env` a Git
2. ✅ Usar API Keys de producción (no desarrollo)
3. ✅ Especificar CORS_ORIGINS exactos (no `*`)
4. ✅ Usar LOG_LEVEL=info en producción (no `debug`)
5. ✅ Rotar API_KEY regularmente
