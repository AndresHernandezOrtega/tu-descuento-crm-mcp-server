import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { AlliedCommerceService } from '@services/allied-commerce-service.js'
import { CategoriesService } from '@services/categories-service.js'

/**
 * Tool para obtener información detallada de un comercio aliado
 */
export const getAlliedCommerceTool: Tool = {
  name: 'get_allied_commerce',
  description:
    'Obtiene información detallada de un comercio aliado (marca o empresa) que ofrece descuentos especiales ' +
    'a los clientes de Tu Descuento Colombia. Proporciona información sobre la empresa incluyendo: código, ' +
    'razón social, teléfono, email, dirección principal, descripción de la actividad comercial (puede incluir ' +
    'ubicaciones de sucursales y contactos adicionales) y lista de descuentos que ofrece. ' +
    'Para usar este tool, necesitas el ID del comercio aliado obtenido de consultas previas de descuentos o membresías.',
  inputSchema: {
    type: 'object',
    properties: {
      allied_commerce_id: {
        type: 'number',
        description: 'ID del comercio aliado del cual se desea obtener información',
      },
    },
    required: ['allied_commerce_id'],
  },
}

/**
 * Handler para ejecutar la obtención de información de un comercio aliado
 */
export async function handleGetAlliedCommerce(args: any) {
  const alliedCommerceId = args.allied_commerce_id

  if (!alliedCommerceId || typeof alliedCommerceId !== 'number') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro allied_commerce_id es requerido y debe ser un número',
        },
      ],
      isError: true,
    }
  }

  const alliedCommerceService = new AlliedCommerceService()
  const result = await alliedCommerceService.getAlliedCommerceById(alliedCommerceId)

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || `No se pudo obtener la información del comercio aliado ${alliedCommerceId}`,
        },
      ],
      isError: true,
    }
  }

  const commerce = result.data.alliedCommerce

  // Formatear la respuesta mostrando solo la información permitida
  let responseText = `📍 Información del Comercio Aliado\n\n`
  responseText += `🏢 Razón Social: ${commerce.razon_social}\n`
  responseText += `🔖 Código: ${commerce.code}\n`
  responseText += `📞 Teléfono: ${commerce.telefono}\n`
  responseText += `📧 Email: ${commerce.email}\n`
  responseText += `📍 Dirección: ${commerce.direccion_domicilio_principal}\n\n`
  responseText += `📝 Descripción:\n${commerce.descripcion}\n\n`

  // Mostrar descuentos disponibles
  if (commerce.discounts && commerce.discounts.length > 0) {
    responseText += `🎁 Descuentos Ofrecidos (${commerce.discounts.length}):\n\n`
    commerce.discounts.forEach((discount, index) => {
      responseText += `${index + 1}. ${discount.nombre}\n`
      responseText += `   - Tipo: ${discount.tipo_beneficio}\n`

      if (discount.tipo_beneficio === 'PORCENTAJE' && discount.porcentaje !== null) {
        responseText += `   - Descuento: ${discount.porcentaje}%\n`
      } else if (discount.tipo_beneficio === 'VALOR_FIJO' && discount.valor_fijo !== null) {
        responseText += `   - Precio fijo: $${discount.valor_fijo.toLocaleString('es-CO')}\n`
      }

      responseText += `   - Descripción: ${discount.descripcion}\n`
      responseText += `   - Estado: ${discount.activo ? '✅ Activo' : '❌ Inactivo'}\n\n`
    })
  } else {
    responseText += `🎁 Este comercio no tiene descuentos registrados actualmente.\n\n`
  }

  // Incluir solo los datos permitidos en formato JSON
  const filteredData = {
    code: commerce.code,
    razon_social: commerce.razon_social,
    telefono: commerce.telefono,
    email: commerce.email,
    direccion_domicilio_principal: commerce.direccion_domicilio_principal,
    descripcion: commerce.descripcion,
    discounts: commerce.discounts,
  }

  responseText += '\n--- Datos completos en JSON ---\n'
  responseText += JSON.stringify(filteredData, null, 2)

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
 * Tool para obtener comercios aliados por categoría
 */
export const getAlliedCommercesByCategoryTool: Tool = {
  name: 'get_allied_commerces_by_category',
  description:
    'Obtiene todos los comercios aliados que ofrecen descuentos dentro de una categoría específica de Tu Descuento Colombia. ' +
    'Proporciona información de la categoría junto con la lista completa de comercios aliados, incluyendo para cada comercio: ' +
    'código, razón social, teléfono, email, dirección, descripción y todos los descuentos disponibles en esa categoría. ' +
    'Este tool es útil para cuando un cliente busca descuentos en una categoría particular (ej: restaurantes, productos, servicios). ' +
    'Para usar este tool, necesitas el ID de la categoría obtenido previamente mediante get_categories.',
  inputSchema: {
    type: 'object',
    properties: {
      category_id: {
        type: 'number',
        description: 'ID de la categoría para la cual se desean obtener los comercios aliados',
      },
    },
    required: ['category_id'],
  },
}

/**
 * Handler para ejecutar la obtención de comercios aliados por categoría
 */
export async function handleGetAlliedCommercesByCategory(args: any) {
  const categoryId = args.category_id

  if (!categoryId || typeof categoryId !== 'number') {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: El parámetro category_id es requerido y debe ser un número',
        },
      ],
      isError: true,
    }
  }

  const categoriesService = new CategoriesService()
  const result = await categoriesService.getAlliedCommercesByCategory(categoryId)

  if (!result.success || !result.data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: result.error?.message || `No se pudieron obtener los comercios aliados de la categoría ${categoryId}`,
        },
      ],
      isError: true,
    }
  }

  const category = result.data.category
  const commerces = category.allied_commerces

  // Formatear la respuesta
  let responseText = `📁 Categoría: ${category.name}\n`
  responseText += `📝 Descripción: ${category.descripcion}\n\n`
  responseText += `🏢 Se encontraron ${commerces.length} comercio(s) aliado(s) en esta categoría:\n\n`

  commerces.forEach((commerce, index) => {
    responseText += `${index + 1}. ${commerce.razon_social} (ID: ${commerce.id})\n`
    responseText += `   📞 Teléfono: ${commerce.telefono}\n`
    responseText += `   📧 Email: ${commerce.email}\n`
    responseText += `   📍 Dirección: ${commerce.direccion_domicilio_principal}\n`
    responseText += `   📝 Descripción: ${commerce.descripcion}\n`

    if (commerce.discounts && commerce.discounts.length > 0) {
      responseText += `   🎁 Descuentos (${commerce.discounts.length}):\n`
      commerce.discounts.forEach((discount) => {
        responseText += `      • ${discount.nombre}: `
        if (discount.tipo_beneficio === 'PORCENTAJE' && discount.porcentaje !== null) {
          responseText += `${discount.porcentaje}% de descuento`
        } else if (discount.tipo_beneficio === 'VALOR_FIJO' && discount.valor_fijo !== null) {
          responseText += `Precio fijo $${discount.valor_fijo.toLocaleString('es-CO')}`
        }
        responseText += ` ${discount.activo ? '✅' : '❌'}\n`
      })
    } else {
      responseText += `   🎁 Sin descuentos registrados\n`
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
