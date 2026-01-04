/**
 * Media Provider model based on Plex Media Provider specification
 * See: docs/MediaProvider.md
 */

/**
 * Metadata type constants
 */
export enum MetadataType {
  MOVIE = 1,
  SHOW = 2,
  SEASON = 3,
  EPISODE = 4,
  COLLECTION = 18,
}

/**
 * Feature type constants
 */
export enum FeatureType {
  METADATA = 'metadata',
  MATCH = 'match',
  COLLECTION = 'collection',
}

/**
 * GUID scheme definition
 */
export interface Scheme {
  scheme: string;
}

/**
 * Metadata type definition with supported schemes
 */
export interface TypeDefinition {
  type: MetadataType;
  Scheme: Scheme[];
}

/**
 * Feature definition with endpoint path
 */
export interface Feature {
  type: FeatureType;
  key: string;
}

/**
 * Root MediaProvider object
 */
export interface MediaProvider {
  identifier: string;
  title: string;
  version?: string;
  Types: TypeDefinition[];
  Feature: Feature[];
}

/**
 * Root response wrapper
 */
export interface MediaProviderResponse {
  MediaProvider: MediaProvider;
}
