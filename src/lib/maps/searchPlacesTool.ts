import type { LlmTool } from '../llm/index'

export const searchPlacesTool: LlmTool = {
  name: 'searchPlaces',
  description: 'Search for real places using Google Places. Call this whenever the user wants to find, add, or get suggestions for places to visit.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query, e.g. "famous ramen near Bukchon Hanok Village"' },
      nearLocation: {
        type: 'object',
        description: 'Optional center point for the search',
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
        required: ['lat', 'lng'],
      },
    },
    required: ['query'],
  },
}
