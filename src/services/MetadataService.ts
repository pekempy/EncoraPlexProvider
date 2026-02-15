/**
 * Metadata Service - Handles metadata requests by ratingKey
 * See: docs/API Endpoints.md - Metadata Feature
 */

import { EncoraService } from './EncoraService';
import { MetadataResponse, Image } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';


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
  constructor(apiKey: string) {
    this.encoraService = new EncoraService(apiKey);
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
