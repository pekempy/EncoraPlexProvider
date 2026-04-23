import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

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
        } catch (error) {
            logger.error(`[PlexService] Failed to find internal ID for GUID ${guid}:`, error);
            return null;
        }
    }

    /**
     * Emulates the Web UI manual subtitle upload
     */
    async uploadSubtitle(ratingKey: string, filePath: string, languageCode: string = 'en'): Promise<boolean> {
        if (!this.token) return false;

        try {
            if (!fs.existsSync(filePath)) {
                logger.error(`[PlexService] Subtitle file not found: ${filePath}`);
                return false;
            }

            const fileName = path.basename(filePath);
            const format = fileName.split('.').pop() || 'srt';
            const fileData = fs.readFileSync(filePath);

            // The manual upload endpoint expects a POST to /library/metadata/{id}/subtitles
            // with the raw file data in the body.
            const response = await this.client.post(`/library/metadata/${ratingKey}/subtitles`, fileData, {
                params: {
                    title: fileName,
                    format: format,
                    languageCode: languageCode,
                },
                headers: {
                    'Content-Type': 'text/plain', // Plex expects this or similar for raw data
                }
            });

            if (response.status === 200 || response.status === 201) {
                logger.info(`[PlexService] Successfully uploaded subtitle ${fileName} to item ${ratingKey}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`[PlexService] Failed to upload subtitle to item ${ratingKey}:`, error);
            return false;
        }
    }
}
