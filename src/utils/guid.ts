/**
 * GUID utility functions
 * See: docs/Metadata.md#guid-construction
 */

import { MetadataTypeString } from '../models/Metadata';
import { API_PATHS } from '../constants';

/**
 * Validates a ratingKey format
 * Must contain only ASCII letters, numbers, dashes, and underscores
 */
export function validateRatingKey(ratingKey: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(ratingKey);
}

/**
 * Constructs a Plex-compatible GUID
 * Format: {scheme}://{metadataType}/{ratingKey}
 *
 * @param scheme - Provider identifier (e.g., "tv.plex.agents.custom.example.themoviedb.tv")
 * @param metadataType - Type of metadata (movie, show, season, episode)
 * @param ratingKey - Unique identifier for the item
 * @returns Formatted GUID string
 * @throws Error if ratingKey contains invalid characters
 */
export function constructGuid(
  scheme: string,
  metadataType: MetadataTypeString,
  ratingKey: string
): string {
  if (!validateRatingKey(ratingKey)) {
    throw new Error(
      `Invalid ratingKey: "${ratingKey}". Must contain only ASCII letters, numbers, dashes, and underscores.`
    );
  }

  return `${scheme}://${metadataType}/${ratingKey}`;
}

/**
 * Parses a GUID into its components
 *
 * @param guid - GUID string to parse
 * @returns Object with scheme, metadataType, and ratingKey
 * @throws Error if GUID format is invalid
 */
export function parseGuid(guid: string): {
  scheme: string;
  metadataType: string;
  ratingKey: string;
} {
  const match = guid.match(/^([^:]+):\/\/([^/]+)\/(.+)$/);

  if (!match) {
    throw new Error(`Invalid GUID format: "${guid}"`);
  }

  const [, scheme, metadataType, ratingKey] = match;

  return {
    scheme,
    metadataType,
    ratingKey,
  };
}

/**
 * Constructs an API key (endpoint path) for metadata
 * Format: /library/metadata/{ratingKey}
 */
export function constructMetadataKey(ratingKey: string): string {
  return `${API_PATHS.LIBRARY_METADATA}/${ratingKey}`;
}

/**
 * Constructs an API key for metadata with children
 * Format: /library/metadata/{ratingKey}/children
 */
export function constructMetadataKeyWithChildren(ratingKey: string): string {
  return `${API_PATHS.LIBRARY_METADATA}/${ratingKey}/children`;
}

/**
 * Creates an external GUID reference (for Guid array)
 *
 * @param provider - Provider name (e.g., "imdb", "tmdb", "tvdb")
 * @param id - External ID
 * @returns Formatted external GUID
 */
export function createExternalGuid(provider: string, id: string | number): string {
  return `${provider}://${id}`;
}
