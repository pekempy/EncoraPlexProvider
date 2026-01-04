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

    // Parse ratingKey -> encora-recording-{ID}
    const match = ratingKey.match(/^encora-recording-(\d+)$/);
    if (!match) {
      throw new Error(`Invalid ratingKey format: ${ratingKey}`);
    }

    const id = parseInt(match[1], 10);
    return this.encoraService.matchRecording(id);
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
    // Parse ratingKey -> encora-recording-{ID}
    const match = ratingKey.match(/^encora-recording-(\d+)$/);
    if (!match) {
      throw new Error(`Invalid ratingKey format: ${ratingKey}`);
    }

    const id = parseInt(match[1], 10);
    const metadataResponse = await this.encoraService.matchRecording(id);
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
