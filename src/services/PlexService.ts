import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

export interface PlexStream {
    id: number;
    streamType: number;
    codec: string;
    language?: string;
    languageCode?: string;
    extendedDisplayTitle?: string;
    title?: string;
    key?: string;
}

export class PlexService {
    private client: AxiosInstance;
    private token: string;
    private serverUrl: string;

    constructor() {
        this.token = config.plex.token;
        this.serverUrl = config.plex.serverUrl;
        this.client = axios.create({
            baseURL: this.serverUrl,
            headers: {
                'X-Plex-Token': this.token,
                'Accept': 'application/json',
            },
        });
    }

    /**
     * Finds the internal Plex ratingKey for a given GUID
     */
    async findInternalId(guid: string): Promise<string | null> {
        if (!this.token) return null;

        try {
            const response = await this.client.get('/library/all', {
                params: { guid }
            });

            const metadata = response.data?.MediaContainer?.Metadata;
            if (metadata && metadata.length > 0) {
                return metadata[0].ratingKey;
            }
            return null;
        } catch (error: any) {
            logger.error(`[PlexService] Failed to find internal ID for GUID ${guid}: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetches all subtitle streams for a given ratingKey
     */
    async getSubtitleStreams(ratingKey: string): Promise<PlexStream[]> {
        if (!this.token) return [];

        try {
            const response = await this.client.get(`/library/metadata/${ratingKey}`);
            const metadata = response.data?.MediaContainer?.Metadata?.[0];
            const streams: PlexStream[] = [];

            if (metadata?.Media) {
                for (const media of metadata.Media) {
                    if (media.Part) {
                        for (const part of media.Part) {
                            if (part.Stream) {
                                for (const stream of part.Stream) {
                                    if (stream.streamType === 3) { // Subtitles
                                        streams.push(stream);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return streams;
        } catch (error: any) {
            logger.error(`[PlexService] Failed to fetch streams for item ${ratingKey}: ${error.message}`);
            return [];
        }
    }

    /**
     * Deletes a stream by its ID
     */
    async deleteStream(streamId: number): Promise<boolean> {
        if (!this.token) return false;

        try {
            const response = await this.client.delete(`/library/streams/${streamId}`);
            return response.status === 200 || response.status === 204;
        } catch (error: any) {
            if (error.response?.status === 403) {
                logger.error(`[PlexService] Failed to delete stream ${streamId}: Permission Denied (Ensure "Allow media deletion" is enabled in Plex settings)`);
            } else {
                logger.error(`[PlexService] Failed to delete stream ${streamId}: ${error.message}`);
            }
            return false;
        }
    }

    /**
     * Maps 2-letter language codes to 3-letter ISO 639-2/B codes for Plex
     */
    private toPlexLanguageCode(code: string): string {
        const map: Record<string, string> = {
            'en': 'eng',
            'es': 'spa',
            'fr': 'fre',
            'de': 'ger',
            'it': 'ita',
            'pt': 'por',
            'nl': 'dut',
            'ja': 'jpn',
            'ru': 'rus',
            'zh': 'chi',
            'ko': 'kor',
            'cs': 'cze'
        };
        return map[code.toLowerCase()] || code;
    }

    /**
     * Emulates the Web UI manual subtitle upload
     */
    async uploadSubtitle(ratingKey: string, filePath: string, languageCode: string = 'en', title?: string): Promise<boolean> {
        if (!this.token) return false;

        try {
            if (!fs.existsSync(filePath)) {
                logger.error(`[PlexService] Subtitle file not found: ${filePath}`);
                return false;
            }

            const fileName = path.basename(filePath);
            const format = fileName.split('.').pop()?.toLowerCase() || 'srt';
            const fileData = fs.readFileSync(filePath);
            
            const plexLang = this.toPlexLanguageCode(languageCode);
            
            // Plex's manual upload API is finicky about params.
            // Based on plexapi and Web UI inspection:
            // We include the language code in the title to help Plex identify it,
            // as 'languageCode' might not be a supported param on this endpoint.
            const displayTitle = title || fileName;
            const uploadTitle = `${displayTitle}.${plexLang}.${format}`;

            const response = await this.client.post(`/library/metadata/${ratingKey}/subtitles`, fileData, {
                params: {
                    title: uploadTitle,
                    format: format,
                },
                headers: {
                    // Remove explicit Content-Type or use text/plain as fallback
                    'Content-Type': 'application/octet-stream',
                    'Accept': 'text/plain, */*',
                }
            });

            if (response.status === 200 || response.status === 201) {
                logger.info(`[PlexService] Successfully uploaded subtitle "${displayTitle}" (${plexLang}) to item ${ratingKey}`);
                return true;
            }
            return false;
        } catch (error: any) {
            logger.error(`[PlexService] Failed to upload subtitle "${title}" to item ${ratingKey}: ${error.message} (Status: ${error.response?.status})`);
            return false;
        }
    }
}
