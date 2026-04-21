/**
 * Metadata Service - Handles metadata requests by ratingKey
 * See: docs/API Endpoints.md - Metadata Feature
 */

import { EncoraService } from './EncoraService';
import { MetadataResponse, Image } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { NfoService } from './NfoService';


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
  private nfoService: NfoService;

  constructor(apiKey: string) {
    this.encoraService = new EncoraService(apiKey);
    this.nfoService = new NfoService();
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

    // Case 2: Local NFO ratingKey (local-nfo-{BASE64_PATH})
    const nfoMatch = ratingKey.match(/^local-nfo-(.+)$/);
    if (nfoMatch) {
      const base64 = nfoMatch[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add back padding if needed
      const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      
      const filePath = Buffer.from(paddedBase64, 'base64').toString('utf-8');
      console.log(`Metadata request for local NFO: ${filePath}`);
      const metadata = this.nfoService.parseMovieNfo(filePath);
      if (metadata) {
        return {
          MediaContainer: {
            offset: 0,
            totalSize: 1,
            identifier: MOVIE_PROVIDER_IDENTIFIER,
            size: 1,
            Metadata: [metadata],
          },
        };
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
