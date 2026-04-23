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
     * Maps language codes to 3-letter ISO 639-2/B codes for Plex
     * Supports a wide range of languages requested by the user.
     */
    private toPlexLanguageCode(code: string): string {
        const map: Record<string, string> = {
            'en': 'eng', 'fr': 'fra', 'es': 'spa', 'nl': 'nld', 'de': 'deu', 'it': 'ita',
            'pt': 'por', 'pt-br': 'por', 'ja': 'jpn', 'ru': 'rus', 'cs': 'ces', 'ko': 'kor',
            'hu': 'hun', 'sv': 'swe', 'pl': 'pol', 'da': 'dan', 'no': 'nor', 'fi': 'fin',
            'he': 'heb', 'zh': 'zho', 'ca': 'cat', 'yi': 'yid', 'es-419': 'spa',
            'hr': 'hrv', 'sr': 'srp', 'et': 'est', 'lv': 'lav', 'lt': 'lit', 'ro': 'ron',
            'el': 'ell', 'tr': 'tur', 'sk': 'slk', 'bg': 'bul', 'ms': 'msa', 'kk': 'kaz',
            'ka': 'kat', 'ar': 'ara', 'sw': 'swa', 'sq': 'sqi', 'mk': 'mkd', 'uk': 'ukr',
            'kw': 'cor', 'la': 'lat', 'hy': 'hye', 'is': 'isl', 'fil': 'fil', 'ase': 'ase', 'bsl': 'bsl',
            'apc': 'ara', 'gsw': 'ger', 'sco': 'eng'
        };
        const normalized = code.toLowerCase().trim();
        return map[normalized] || normalized;
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
            
            const displayTitle = title || fileName;
            const uploadTitle = `${displayTitle}.${plexLang}.${format}`;

            const response = await this.client.post(`/library/metadata/${ratingKey}/subtitles`, fileData, {
                params: {
                    title: uploadTitle,
                    format: format,
                },
                headers: {
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
