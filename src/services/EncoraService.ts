/**
 * Encora Service - Handles interaction with Encora API and mapping to Plex Metadata
 */

import { EncoraClient } from './EncoraClient';
import { StageMediaClient } from './StageMediaClient';
import { EncoraMapper } from '../mappers/EncoraMapper';
import { config } from '../config/env';
import { MetadataResponse, MovieMetadata } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';

export class EncoraService {
    private encoraClient: EncoraClient;
    private stageMediaClient: StageMediaClient;
    private mapper: EncoraMapper;

    constructor(apiKey: string) {
        this.encoraClient = new EncoraClient(apiKey);
        this.stageMediaClient = new StageMediaClient(config.stagemedia.apiKey);
        this.mapper = new EncoraMapper();
    }

    /**
     * Find a recording by ID and map it
     */
    async matchRecording(id: number): Promise<MetadataResponse> {
        try {
            const recording = await this.encoraClient.getRecordingDetails(id);

            // Fetch images from StageMedia
            let stageMediaImages: import('./StageMediaClient').StageMediaResponse = { performers: [], posters: undefined };
            if (recording.metadata && recording.metadata.show_id) {
                const actorIds = recording.cast.map(c => c.performer.id);
                try {
                    stageMediaImages = await this.stageMediaClient.getImages(recording.metadata.show_id, actorIds);
                } catch (imgError) {
                    console.error('Failed to fetch StageMedia images:', imgError);
                    // Non-fatal, continue with mapping without images
                }
            }

            // Fetch subtitles from Encora
            let subtitles: import('../types/encora').EncoraSubtitle[] = [];
            try {
                subtitles = await this.encoraClient.getRecordingSubtitles(id);
                console.log(`Fetched ${subtitles.length} subtitles for recording ${id}`);
            } catch (subError) {
                console.error('Failed to fetch subtitles:', subError);
                // Non-fatal
            }

            const metadata = this.mapper.mapRecording(recording, stageMediaImages, subtitles);

            return {
                MediaContainer: {
                    offset: 0,
                    totalSize: 1,
                    identifier: MOVIE_PROVIDER_IDENTIFIER,
                    size: 1,
                    Metadata: [metadata],
                },
            };
        } catch (error) {
            console.error('Error matching recording by ID:', error);
            if (error instanceof Error && 'response' in (error as any)) {
                console.error('API Response Data:', (error as any).response.data);
            }
            return {
                MediaContainer: {
                    offset: 0,
                    totalSize: 0,
                    identifier: MOVIE_PROVIDER_IDENTIFIER,
                    size: 0,
                    Metadata: [],
                },
            };
        }
    }

    /**
     * Search for recordings (currently only supports ID lookup)
     */
    async search(query: string): Promise<MetadataResponse> {
        // Only trigger if query is numeric (ID)
        const idMatch = query.match(/^(\d+)$/);
        if (idMatch) {
            const id = parseInt(idMatch[1], 10);
            return this.matchRecording(id);
        }

        // Return empty for non-ID queries
        console.log(`Search query "${query}" is not an ID. Searching by name not supported.`);
        return {
            MediaContainer: {
                offset: 0,
                totalSize: 0,
                identifier: MOVIE_PROVIDER_IDENTIFIER,
                size: 0,
                Metadata: [],
            },
        };
    }
}
