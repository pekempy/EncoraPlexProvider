/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { MOVIE_PROVIDER_VERSION } from '../providers/MovieProvider';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Encora Plex Provider API',
      version: MOVIE_PROVIDER_VERSION,
      description: 'A Plex-compatible Custom Metadata Provider for Movies using Encora API',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: baseUrl,
        description: 'API server',
      },
    ],
    tags: [
      {
        name: 'Provider',
        description: 'MediaProvider definition endpoints',
      },
      {
        name: 'Metadata',
        description: 'Metadata retrieval by ratingKey',
      },
      {
        name: 'Match',
        description: 'Content matching and search',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
