/**
 * Metadata Service - Handles metadata requests by ratingKey
 * See: docs/API Endpoints.md - Metadata Feature
 */

import { EncoraService } from './EncoraService';
import { MetadataResponse, Image } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { NfoParser } from './NfoParser';

/**
 * Images response
 */
export interface ImagesResponse {
  MediaContainer: {
    offset: number;
    totalSize: number;
    identifier: string;
    size: number;
    Image: Image[];
  };
}

/**
 * Metadata service options
 */
export interface MetadataServiceOptions {
  language?: string;
  country?: string;
}

export class MetadataService {
  private encoraService: EncoraService;
  private nfoParser: NfoParser;

  constructor(apiKey: string) {
    this.encoraService = new EncoraService(apiKey);
    this.nfoParser = new NfoParser();
  }

  /**
   * Get metadata by ratingKey
   * @param ratingKey - The ratingKey to fetch (e.g., "encora-recording-12345")
   * @param options - Language, country options
   */
  async getMetadata(
    ratingKey: string,
    options: MetadataServiceOptions = {}
  ): Promise<MetadataResponse> {
    console.log(`Metadata request for ratingKey: ${ratingKey}`);

    // Case 1: Encora ratingKey (encora-recording-{ID})
    const encoraMatch = ratingKey.match(/^encora-recording-(\d+)$/);
    if (encoraMatch) {
      const id = parseInt(encoraMatch[1], 10);
      return this.encoraService.matchRecording(id);
    }

    // Case 2: NFO ratingKey (nfo-file-{hexPath})
    const nfoMatch = ratingKey.match(/^nfo-file-([0-9a-f]+)$/);
    if (nfoMatch) {
      try {
        const hexPath = nfoMatch[1];
        const filename = Buffer.from(hexPath, 'hex').toString('utf-8');
        console.log(`[NFO] Fetching metadata for file: ${filename}`);

        const nfoMetadata = this.nfoParser.tryParseNfoForFile(filename);
        if (nfoMetadata) {
          return {
            MediaContainer: {
              offset: 0,
              totalSize: 1,
              identifier: MOVIE_PROVIDER_IDENTIFIER,
              size: 1,
              Metadata: [nfoMetadata],
            },
          };
        }
      } catch (error) {
        console.error(`Error processing NFO ratingKey ${ratingKey}:`, error);
      }
    }

    throw new Error(`Invalid or unsupported ratingKey format: ${ratingKey}`);
  }

  /**
   * Get all images for an item by ratingKey
   * @param ratingKey - The ratingKey to fetch images for
   * @param options - Language options
   */
  async getImages(
    ratingKey: string,
    options: MetadataServiceOptions = {}
  ): Promise<ImagesResponse> {
    const metadataResponse = await this.getMetadata(ratingKey, options);
    const images = metadataResponse.MediaContainer.Metadata[0]?.Image || [];

    return {
      MediaContainer: {
        offset: 0,
        totalSize: images.length,
        identifier: MOVIE_PROVIDER_IDENTIFIER,
        size: images.length,
        Image: images,
      },
    };
  }
}
