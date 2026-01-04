/**
 * TheMovieDB TV Show Provider
 * Supports TV Shows, Seasons, and Episodes
 */

import {
  MediaProvider,
  MediaProviderResponse,
  MetadataType,
  FeatureType,
} from '../models/MediaProvider';
import { API_PATHS } from '../constants';

/**
 * TV Provider configuration
 */
export const MOVIE_PROVIDER_IDENTIFIER = 'tv.plex.agents.custom.encora';
export const MOVIE_PROVIDER_TITLE = 'Encora Movie Provider';
export const MOVIE_PROVIDER_VERSION = '1.0.0';
export const MOVIE_PROVIDER_BASE_PATH = '/movie';

/**
 * Creates the MOVIE MediaProvider definition
 */
export function createMovieProvider(): MediaProvider {
  return {
    identifier: MOVIE_PROVIDER_IDENTIFIER,
    title: MOVIE_PROVIDER_TITLE,
    version: MOVIE_PROVIDER_VERSION,
    Types: [
      {
        type: MetadataType.MOVIE,
        Scheme: [
          {
            scheme: MOVIE_PROVIDER_IDENTIFIER,
          },
        ],
      },
    ],
    Feature: [
      {
        type: FeatureType.METADATA,
        key: `${API_PATHS.LIBRARY_METADATA}`,
      },
      {
        type: FeatureType.MATCH,
        key: `${API_PATHS.LIBRARY_MATCHES}`,
      },
    ],
  };
}

/**
 * Gets the full MediaProvider response
 */
export function getMovieProviderResponse(): MediaProviderResponse {
  return {
    MediaProvider: createMovieProvider(),
  };
}
