/**
 * Movie Provider Routes
 */

import { Router, Request, Response } from 'express';
import { MatchService, MatchRequest } from '../services/MatchService';
import { MetadataService } from '../services/MetadataService';
import { config } from '../config/env';
import { API_PATHS } from '../constants';
import { getMovieProviderResponse } from '../providers/MovieProvider';

const router = Router();

// Initialize services (will be reused across requests)
let matchService: MatchService | null = null;
let metadataService: MetadataService | null = null;

function getMatchService(): MatchService {
  if (!matchService) {
    matchService = new MatchService(config.encora.apiKey);
  }
  return matchService;
}

function getMetadataService(): MetadataService {
  if (!metadataService) {
    metadataService = new MetadataService(config.encora.apiKey);
  }
  return metadataService;
}

/**
 * @openapi
 * /movie:
 *   get:
 *     tags:
 *       - Provider
 *     summary: Get MediaProvider definition
 *     description: Returns the MediaProvider definition for movies including supported types and features
 *     responses:
 *       200:
 *         description: MediaProvider definition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 MediaProvider:
 *                   type: object
 *                   properties:
 *                     identifier:
 *                       type: string
 *                       example: tv.plex.agents.custom.encora
 *                     title:
 *                       type: string
 *                       example: Encora Movie Provider
 *                     version:
 *                       type: string
 *                       example: 1.0.0
 *                     Types:
 *                       type: array
 *                       items:
 *                         type: object
 *                     Feature:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/', (_req: Request, res: Response) => {
  const providerResponse = getMovieProviderResponse();
  res.json(providerResponse);
});

/**
 * @openapi
 * /movie/library/metadata/{ratingKey}/images:
 *   get:
 *     tags:
 *       - Metadata
 *     summary: Get all images for an item
 *     description: Returns all available image assets for a specific item (movie)
 *     parameters:
 *       - in: path
 *         name: ratingKey
 *         required: true
 *         schema:
 *           type: string
 *         description: The ratingKey of the item
 *         examples:
 *           movie:
 *             value: encora-recording-15004
 *             summary: Movie/Recording
 *       - in: header
 *         name: X-Plex-Language
 *         schema:
 *           type: string
 *           example: en-US
 *         description: Language for metadata
 *     responses:
 *       200:
 *         description: Images response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 MediaContainer:
 *                   type: object
 *                   properties:
 *                     offset:
 *                       type: number
 *                     totalSize:
 *                       type: number
 *                     identifier:
 *                       type: string
 *                     size:
 *                       type: number
 *                     Image:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           url:
 *                             type: string
 *                           alt:
 *                             type: string
 *       500:
 *         description: Internal server error
 */
router.get(`${API_PATHS.LIBRARY_METADATA}/:ratingKey/images`, async (req: Request, res: Response) => {
  try {
    const { ratingKey } = req.params;

    // Get language from headers or query params
    const language = (req.headers['x-plex-language'] as string) ||
      (req.query['X-Plex-Language'] as string) ||
      'en-US';

    // Get images
    const service = getMetadataService();
    const result = await service.getImages(ratingKey, { language });

    res.json(result);
  } catch (error) {
    console.error('Images error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @openapi
 * /movie/library/metadata/{ratingKey}:
 *   get:
 *     tags:
 *       - Metadata
 *     summary: Get metadata by ratingKey
 *     description: Returns metadata for a specific item (movie) by its ratingKey
 *     parameters:
 *       - in: path
 *         name: ratingKey
 *         required: true
 *         schema:
 *           type: string
 *         description: The ratingKey of the item (e.g., "encora-recording-15004")
 *         examples:
 *           movie:
 *             value: encora-recording-15004
 *             summary: Movie/Recording
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Include child items (seasons for shows, episodes for seasons)
 *       - in: header
 *         name: X-Plex-Language
 *         schema:
 *           type: string
 *           example: en-US
 *         description: Language for metadata
 *       - in: header
 *         name: X-Plex-Country
 *         schema:
 *           type: string
 *           example: US
 *         description: Country for content ratings
 *     responses:
 *       200:
 *         description: Metadata response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 MediaContainer:
 *                   type: object
 *                   properties:
 *                     offset:
 *                       type: number
 *                     totalSize:
 *                       type: number
 *                     identifier:
 *                       type: string
 *                     size:
 *                       type: number
 *                     Metadata:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Internal server error
 */
router.get(`${API_PATHS.LIBRARY_METADATA}/:ratingKey`, async (req: Request, res: Response) => {
  try {
    const { ratingKey } = req.params;

    // Get language and country from headers or query params
    const language = (req.headers['x-plex-language'] as string) ||
      (req.query['X-Plex-Language'] as string) ||
      'en-US';
    const country = (req.headers['x-plex-country'] as string) ||
      (req.query['X-Plex-Country'] as string) ||
      'US';

    // Get metadata
    const service = getMetadataService();
    const result = await service.getMetadata(ratingKey, {
      language,
      country,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @openapi
 * /movie/library/metadata/{ratingKey}/children:
 *   get:
 *     tags:
 *       - Metadata
 *     responses:
 *       200:
 *         description: Paged children response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 MediaContainer:
 *                   type: object
 *                   properties:
 *                     offset:
 *                       type: number
 *                     totalSize:
 *                       type: number
 *                     identifier:
 *                       type: string
 *                     size:
 *                       type: number
 *                     Metadata:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Internal server error
 */
// Children and Grandchildren endpoints removed as they are not supported for Movies/Recordings

/**
 * @openapi
 * /movie/library/metadata/matches:
 *   post:
 *     tags:
 *       - Match
 *     summary: Match content
 *     description: Search for Movies based on provided hints
 *     parameters:
 *       - in: header
 *         name: X-Plex-Language
 *         schema:
 *           type: string
 *           example: en-US
 *         description: Language for metadata
 *       - in: header
 *         name: X-Plex-Country
 *         schema:
 *           type: string
 *           example: US
 *         description: Country for content ratings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: number
 *                 description: Metadata type (1=movie)
 *                 enum: [1]
 *               title:
 *                 type: string
 *                 description: Title of the movie
 *               year:
 *                 type: number
 *                 description: Year of release
 *               guid:
 *                 type: string
 *                 description: External ID (e.g., "encora://12345")
 *               manual:
 *                 type: number
 *                 description: Manual search mode (0 or 1) - returns multiple results if 1
 *                 enum: [0, 1]
 *               includeAdult:
 *                 type: number
 *                 description: Include adult content (0 or 1)
 *                 enum: [0, 1]
 *           examples:
 *             matchMovie:
 *               summary: Match Movie by title
 *               value:
 *                 type: 1
 *                 title: Wicked {e-12345}
 *                 year: 2024
 *             matchByExternalId:
 *               summary: Match by external ID
 *               value:
 *                 type: 1
 *                 guid: encora://15004
 *             manualSearch:
 *               summary: Manual search (multiple results)
 *               value:
 *                 type: 1
 *                 title: Wicked
 *                 manual: 1
 *     responses:
 *       200:
 *         description: Match results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 MediaContainer:
 *                   type: object
 *                   properties:
 *                     offset:
 *                       type: number
 *                     totalSize:
 *                       type: number
 *                     identifier:
 *                       type: string
 *                     size:
 *                       type: number
 *                     Metadata:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Internal server error
 */
router.post(API_PATHS.LIBRARY_MATCHES, async (req: Request, res: Response) => {
  try {
    const matchRequest: MatchRequest = req.body;

    // Get language and country from headers or query params
    const language = (req.headers['x-plex-language'] as string) ||
      (req.query['X-Plex-Language'] as string) ||
      'en-US';
    const country = (req.headers['x-plex-country'] as string) ||
      (req.query['X-Plex-Country'] as string) ||
      'US';

    // Perform the match
    const service = getMatchService();
    const result = await service.match(matchRequest, { language, country });

    res.json(result);
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
