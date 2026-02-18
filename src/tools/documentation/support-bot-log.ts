import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { SupportLogsService } from '@services/support-logs-service.js'

/**
 * Tool para obtener el historial de logs de soporte/ventas de un cliente
 */
export const getSupportLogsTool: Tool = {
  name: 'get_support_logs',
  description:
    'Obtiene el historial de casos de soporte y ventas registrados para un cliente específico basado en su número de identificación. ' +
    'Este tool es útil para revisar interacciones previas, necesidades documentadas, soluciones brindadas y consideraciones de seguimiento. ' +
    'Permite filtrar por rangos de fecha para encontrar casos específicos. Los logs incluyen información detallada sobre: ' +
    'la necesidad del cliente, la solución proporcionada, consideraciones para seguimiento, usuario que atendió y fechas de registro/actualización.',
  inputSchema: {
    type: 'object',
    properties: {
      numero_identificacion: {
        type: 'string',
        description: 'Número de documento de identificación del cliente (cédula, NIT, etc.) sin puntos, guiones o espacios',
      },
      created_at_start: {
        type: 'string',
        description: 'Fecha de inicio del rango de búsqueda en formato Y-m-d (ej: 2026-01-01). Opcional.',
      },
      created_at_end: {
        type: 'string',
        description: 'Fecha de fin del rango de búsqueda en formato Y-m-d (ej: 2026-01-31). Opcional.',
      },
      page: {
        type: 'number',
        description: 'Número de página para paginación (default: 1). Opcional.',
      },
    },
    required: ['numero_identificacion'],
  },
}

/**
 * Handler para ejecutar la obtención de logs de soporte
 */
export async function handleGetSupportLogs(args: any) {
  const { numero_identificacion, created_at_start, created_at_end, page } = args

  if (!numero_identificacion || typeof numero_identificacion !== 'string') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro numero_identificacion es requerido y debe ser un string',
        },
      ],
      isError: true,
    }
  }

  const supportLogsService = new SupportLogsService()
  const result = await supportLogsService.getSupportLogs({
    numero_identificacion,
    created_at_start,
    created_at_end,
    page: page || 1,
  })

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || `No se pudieron obtener los logs de soporte para el número de identificación ${numero_identificacion}`,
        },
      ],
      isError: true,
    }
  }

  const logs = result.data.data
  const pagination = {
    current_page: result.data.current_page,
    total: result.data.total,
    per_page: result.data.per_page,
    last_page: result.data.last_page,
  }

  // Formatear la respuesta
  let responseText = `📋 Historial de Soporte - Cliente: ${numero_identificacion}\n\n`
  responseText += `📊 Total de registros: ${pagination.total} | Página ${pagination.current_page} de ${pagination.last_page}\n`

  if (created_at_start || created_at_end) {
    responseText += `📅 Filtrado por fecha: `
    if (created_at_start) responseText += `desde ${created_at_start} `
    if (created_at_end) responseText += `hasta ${created_at_end}`
    responseText += '\n'
  }

  responseText += '\n'

  if (logs.length === 0) {
    responseText += '❌ No se encontraron registros de soporte para este cliente.'
  } else {
    logs.forEach((log, index) => {
      const logDate = new Date(log.created_at).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      responseText += `📌 Caso #${log.id} - ${logDate}\n`
      responseText += `👤 Cliente: ${log.nombre}\n`
      responseText += `📧 Email: ${log.email} | 📞 Teléfono: ${log.telefono}\n`
      responseText += `👨‍💼 Atendido por: ${log.user.name} (${log.user.email})\n`
      responseText += `🔄 Transferido: ${log.handovered ? 'Sí' : 'No'}\n\n`

      responseText += `💬 Necesidad:\n${log.necesidad}\n\n`
      responseText += `✅ Solución:\n${log.solucion}\n\n`
      responseText += `📝 Consideraciones:\n${log.consideraciones}\n\n`

      if (log.updated_at !== log.created_at) {
        const updateDate = new Date(log.updated_at).toLocaleString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        responseText += `🔄 Última actualización: ${updateDate}\n`
      }

      responseText += '\n' + '─'.repeat(80) + '\n\n'
    })
  }

  responseText += '\n--- Datos completos en JSON ---\n'
  responseText += JSON.stringify(result.data, null, 2)

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText,
      },
    ],
  }
}

/**
 * Tool para registrar o actualizar un caso de soporte/ventas desde el bot
 */
export const createSupportLogTool: Tool = {
  name: 'create_support_log',
  description:
    'Registra o actualiza un caso de soporte/ventas en el sistema de Tu Descuento Colombia. ' +
    'Este tool permite documentar las interacciones con clientes, guardando: la necesidad expresada, ' +
    'la solución brindada y consideraciones para seguimiento. Si ya existe un caso del día para el mismo ' +
    'cliente (mismo número de identificación), el sistema actualizará ese caso agregando la nueva información. ' +
    'Si no existe, creará un nuevo caso. Esto permite mantener un registro consolidado por día de todas las ' +
    'interacciones del bot con cada cliente. IMPORTANTE: Usa este tool al finalizar cada interacción significativa ' +
    'con el cliente para documentar el caso.',
  inputSchema: {
    type: 'object',
    properties: {
      numero_identificacion: {
        type: 'string',
        description: 'Número de documento de identificación del cliente (requerido, sin puntos ni guiones)',
      },
      nombre: {
        type: 'string',
        description: 'Nombre completo del cliente (opcional)',
      },
      email: {
        type: 'string',
        description: 'Correo electrónico del cliente (opcional)',
      },
      telefono: {
        type: 'string',
        description: 'Teléfono del cliente (opcional)',
      },
      handovered: {
        type: 'boolean',
        description: 'Indica si el caso fue transferido a un agente humano (requerido: true/false)',
      },
      necesidad: {
        type: 'string',
        description: 'Descripción detallada de lo que el cliente solicitó o necesitó (requerido)',
      },
      solucion: {
        type: 'string',
        description: 'Descripción de la solución brindada al cliente (requerido)',
      },
      consideraciones: {
        type: 'string',
        description: 'Notas adicionales, recomendaciones de seguimiento o estado del caso (requerido)',
      },
    },
    required: ['numero_identificacion', 'handovered', 'necesidad', 'solucion', 'consideraciones'],
  },
}

/**
 * Handler para ejecutar el registro o actualización de log de soporte
 */
export async function handleCreateSupportLog(args: any) {
  const { numero_identificacion, nombre, email, telefono, handovered, necesidad, solucion, consideraciones } = args

  // Validaciones
  if (!numero_identificacion || typeof numero_identificacion !== 'string') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro numero_identificacion es requerido y debe ser un string',
        },
      ],
      isError: true,
    }
  }

  if (typeof handovered !== 'boolean') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro handovered es requerido y debe ser un booleano (true/false)',
        },
      ],
      isError: true,
    }
  }

  if (!necesidad || typeof necesidad !== 'string') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro necesidad es requerido y debe ser un string',
        },
      ],
      isError: true,
    }
  }

  if (!solucion || typeof solucion !== 'string') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro solucion es requerido y debe ser un string',
        },
      ],
      isError: true,
    }
  }

  if (!consideraciones || typeof consideraciones !== 'string') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro consideraciones es requerido y debe ser un string',
        },
      ],
      isError: true,
    }
  }

  const supportLogsService = new SupportLogsService()
  const result = await supportLogsService.createOrUpdateSupportLog({
    numero_identificacion,
    nombre,
    email,
    telefono,
    handovered,
    necesidad,
    solucion,
    consideraciones,
  })

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || 'No se pudo registrar el caso de soporte',
        },
      ],
      isError: true,
    }
  }

  const response = result.data
  const log = response.data
  const action = response.action

  // Formatear la respuesta
  let responseText = action === 'created' ? '✅ Caso de soporte CREADO exitosamente\n\n' : '🔄 Caso de soporte ACTUALIZADO exitosamente\n\n'

  responseText += `📌 ID del Caso: #${log.id}\n`
  responseText += `👤 Cliente: ${log.nombre}\n`
  responseText += `🆔 Identificación: ${log.numero_identificacion}\n`
  responseText += `📧 Email: ${log.email}\n`
  responseText += `📞 Teléfono: ${log.telefono}\n`
  responseText += `👨‍💼 Atendido por: ${log.user.name}\n`
  responseText += `🔄 Transferido: ${log.handovered ? 'Sí' : 'No'}\n\n`

  responseText += `💬 Necesidad documentada:\n${log.necesidad}\n\n`
  responseText += `✅ Solución brindada:\n${log.solucion}\n\n`
  responseText += `📝 Consideraciones:\n${log.consideraciones}\n\n`

  const createdDate = new Date(log.created_at).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  responseText += `📅 Fecha de registro: ${createdDate}\n`

  if (log.updated_at !== log.created_at) {
    const updatedDate = new Date(log.updated_at).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    responseText += `🔄 Última actualización: ${updatedDate}\n`
  }

  responseText += '\n--- Datos completos en JSON ---\n'
  responseText += JSON.stringify(result.data, null, 2)

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText,
      },
    ],
  }
}
