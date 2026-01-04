/**
 * Metadata model based on Plex Metadata specification
 * See: docs/Metadata.md
 */

/**
 * Metadata type strings
 */
export type MetadataTypeString = 'movie' | 'show' | 'season' | 'episode';

/**
 * Core attributes applicable to all metadata types
 */
export interface BaseMetadata {
  ratingKey: string;
  key: string;
  guid: string;
  type: MetadataTypeString;
  title: string;
  originallyAvailableAt: string; // ISO 8601 format (YYYY-MM-DD)
  thumb?: string;
  art?: string;
  contentRating?: string;
  originalTitle?: string;
  titleSort?: string;
  year?: number;
  summary?: string;
  isAdult?: boolean;
  editionTitle?: string;
}

/**
 * Duration attribute for movies, TV shows, and episodes
 */
export interface WithDuration {
  duration?: number; // Runtime in milliseconds
}

/**
 * Tagline and studio attributes for movies and TV shows
 */
export interface WithTaglineAndStudio {
  tagline?: string;
  studio?: string;
  theme?: string; // URL to theme music (MP3, ~30 seconds)
}

/**
 * Parent attributes for seasons and episodes
 */
export interface WithParent {
  parentRatingKey: string;
  parentKey: string;
  parentGuid: string;
  parentType: string;
  parentTitle: string;
  parentThumb?: string;
  index: number;
}

/**
 * Grandparent attributes for episodes
 */
export interface WithGrandparent {
  grandparentRatingKey: string;
  grandparentKey: string;
  grandparentGuid: string;
  grandparentType: string;
  grandparentTitle: string;
  grandparentThumb?: string;
  parentIndex: number;
}

/**
 * Image asset
 */
export interface Image {
  type: 'background' | 'backgroundSquare' | 'clearLogo' | 'coverPoster' | 'snapshot';
  url: string;
  alt?: string;
}

/**
 * Genre
 */
export interface Genre {
  tag: string;
  originalTag?: string;
}

/**
 * External GUID mapping
 */
export interface Guid {
  id: string; // Format: "provider://id" (e.g., "imdb://tt0088763")
}

/**
 * Collection
 */
export interface Collection {
  guid: string;
  key: string;
  tag: string;
  summary?: string;
  art?: string;
  thumb?: string;
}

/**
 * Country
 */
export interface Country {
  tag: string;
}

/**
 * Person (for Role, Director, Producer, Writer)
 */
export interface Person {
  tag: string;
  thumb?: string;
  role?: string;
  order?: number;
}

/**
 * Similar item
 */
export interface Similar {
  guid: string;
  tag: string;
}

/**
 * Studio
 */
export interface Studio {
  tag: string;
}

/**
 * Rating
 */
export interface Rating {
  image: string; // Image identifier (e.g., "imdb://image.rating")
  type: 'audience' | 'critic';
  value: number; // Float between 0 and 10
}

/**
 * Network (TV Shows only)
 */
export interface Network {
  tag: string;
}

/**
 * Season Type (TV Shows only)
 */
export interface SeasonType {
  id: string; // ASCII characters only
  source: string;
  tag: string;
  title: string;
}

/**
 * Children container (for TV Shows and Seasons)
 */
export interface Children {
  size: number;
  Metadata: Metadata[];
}

/**
 * Movie Metadata
 */
export interface MovieMetadata extends BaseMetadata, WithDuration, WithTaglineAndStudio {
  type: 'movie';
  Image?: Image[];
  OriginalImage?: Image[];
  Genre?: Genre[];
  Guid?: Guid[];
  Collection?: Collection[];
  Country?: Country[];
  Role?: Person[];
  Director?: Person[];
  Producer?: Person[];
  Writer?: Person[];
  Similar?: Similar[];
  Studio?: Studio[];
  Rating?: Rating[];
  Subtitle?: Subtitle[];
}

/**
 * Subtitle
 */
export interface Subtitle {
  id: string; // url
  language: string;
  format: string;
  forced?: boolean;
}

/**
 * TV Show Metadata
 */
export interface ShowMetadata extends BaseMetadata, WithDuration, WithTaglineAndStudio {
  type: 'show';
  Image?: Image[];
  OriginalImage?: Image[];
  Genre?: Genre[];
  Guid?: Guid[];
  Country?: Country[];
  Role?: Person[];
  Director?: Person[];
  Producer?: Person[];
  Writer?: Person[];
  Similar?: Similar[];
  Studio?: Studio[];
  Rating?: Rating[];
  Network?: Network[];
  SeasonType?: SeasonType[];
  Children?: Children;
}

/**
 * Season Metadata
 */
export interface SeasonMetadata extends BaseMetadata, WithParent {
  type: 'season';
  Image?: Image[];
  OriginalImage?: Image[];
  Guid?: Guid[];
  Children?: Children;
}

/**
 * Episode Metadata
 */
export interface EpisodeMetadata extends BaseMetadata, WithDuration, WithParent, WithGrandparent {
  type: 'episode';
  Image?: Image[];
  OriginalImage?: Image[];
  Guid?: Guid[];
  Rating?: Rating[];
  Role?: Person[];
  Director?: Person[];
  Producer?: Person[];
  Writer?: Person[];
}

/**
 * Union type for all metadata types
 */
export type Metadata = MovieMetadata | ShowMetadata | SeasonMetadata | EpisodeMetadata;

/**
 * MediaContainer wraps metadata items in responses
 */
export interface MediaContainer {
  offset: number;
  totalSize: number;
  identifier: string;
  size: number;
  Metadata: Metadata[];
}

/**
 * Root response wrapper
 */
export interface MetadataResponse {
  MediaContainer: MediaContainer;
}