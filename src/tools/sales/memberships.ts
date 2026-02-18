import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MembershipService } from '@services/membership-service.js'

/**
 * Tool para obtener las membresías públicas disponibles para venta
 */
export const getPublicMembershipsTool: Tool = {
  name: 'get_public_memberships',
  description:
    'Obtiene todas las membresías públicas disponibles para venta en Tu Descuento Colombia. ' +
    'Incluye información completa sobre cada membresía: precios, duración en meses, número de beneficiarios permitidos, ' +
    'categorías de descuento disponibles, color identificador y demás características. ' +
    'Estas membresías están habilitadas para ser vendidas por el agente de ventas IA.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
}

/**
 * Handler para ejecutar la obtención de membresías públicas
 */
export async function handleGetPublicMemberships() {
  const membershipService = new MembershipService()
  const result = await membershipService.getPublicMemberships()

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || 'No se pudieron obtener las membresías públicas',
        },
      ],
      isError: true,
    }
  }

  // Formatear la respuesta de manera legible
  const memberships = result.data.memberships
  let responseText = `Se encontraron ${memberships.length} membresía(s) disponible(s) para venta:\n\n`

  memberships.forEach((membership, index) => {
    responseText += `${index + 1}. ${membership.nombre} (ID: ${membership.id})\n`
    responseText += `   - Precio: $${membership.precio_membresia.toLocaleString('es-CO')}\n`
    responseText += `   - Duración: ${membership.meses_duracion} meses\n`
    responseText += `   - Beneficiarios: ${membership.numero_beneficiarios} persona(s)\n`
    responseText += `   - Descripción: ${membership.descripcion}\n`
    responseText += `   - Color: ${membership.color}\n`

    if (membership.categories && membership.categories.length > 0) {
      responseText += `   - Categorías incluidas:\n`
      membership.categories.forEach((category) => {
        responseText += `     • ${category.name}: ${category.descripcion}\n`
      })
    }

    responseText += '\n'
  })

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
 * Tool para obtener los descuentos incluidos en una membresía específica
 */
export const getMembershipDiscountsTool: Tool = {
  name: 'get_membership_discounts',
  description:
    'Obtiene la lista de descuentos incluidos en una membresía específica de Tu Descuento Colombia. ' +
    'Incluye información detallada de cada descuento y el comercio aliado que lo ofrece. ' +
    'IMPORTANTE: Los descuentos pueden ser de dos tipos según el campo "tipo_beneficio": ' +
    '- "PORCENTAJE": El descuento aplica un porcentaje sobre el precio del producto/servicio (usar campo "porcentaje"). ' +
    '- "PORCENTAJE_VALOR_FIJO": El producto/servicio tiene un precio fijo establecido (usar campo "valor_fijo"). ' +
    'Para usar este tool, necesitas primero obtener el ID de la membresía mediante get_public_memberships.',
  inputSchema: {
    type: 'object',
    properties: {
      membership_id: {
        type: 'number',
        description: 'ID de la membresía de la cual se desean obtener los descuentos',
      },
    },
    required: ['membership_id'],
  },
}

/**
 * Handler para ejecutar la obtención de descuentos de una membresía
 */
export async function handleGetMembershipDiscounts(args: any) {
  const membershipId = args.membership_id

  if (!membershipId || typeof membershipId !== 'number') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro membership_id es requerido y debe ser un número',
        },
      ],
      isError: true,
    }
  }

  const membershipService = new MembershipService()
  const result = await membershipService.getMembershipDiscounts(membershipId)

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || `No se pudieron obtener los descuentos de la membresía ${membershipId}`,
        },
      ],
      isError: true,
    }
  }

  // Formatear la respuesta de manera legible
  const discounts = result.data.discounts
  let responseText = `Se encontraron ${discounts.length} descuento(s) para la membresía ${membershipId}:\n\n`

  discounts.forEach((discount, index) => {
    responseText += `${index + 1}. ${discount.nombre} (ID: ${discount.id})\n`
    responseText += `   - Comercio Aliado: ${discount.allied_commerce.razon_social}\n`
    responseText += `   - Teléfono comercio: ${discount.allied_commerce.telefono}\n`
    responseText += `   - Descripción comercio: ${discount.allied_commerce.descripcion}\n`
    responseText += `   - Tipo de beneficio: ${discount.tipo_beneficio}\n`

    if (discount.tipo_beneficio === 'PORCENTAJE' && discount.porcentaje !== null) {
      responseText += `   - Descuento: ${discount.porcentaje}% de rebaja\n`
    } else if (discount.tipo_beneficio === 'VALOR_FIJO' && discount.valor_fijo !== null) {
      responseText += `   - Precio fijo: $${discount.valor_fijo.toLocaleString('es-CO')}\n`
    }

    responseText += `   - Descripción del descuento: ${discount.descripcion}\n`
    responseText += `   - Activo: ${discount.activo ? 'Sí' : 'No'}\n`

    if (discount.condiciones && discount.condiciones !== '[]') {
      responseText += `   - Condiciones: ${discount.condiciones}\n`
    }

    responseText += '\n'
  })

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
