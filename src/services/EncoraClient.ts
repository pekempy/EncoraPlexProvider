/**
 * Encora API Client
 * Documentation: https://encora.it/api-docs
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';
import { EncoraRecording } from '../types/encora';

export class EncoraClient {
    private client: AxiosInstance;
    private apiKey: string;
    private baseURL = 'https://encora.it/api';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'PlexAgent/1.0',
            },
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                const url = `${config.baseURL}${config.url}`;
                const params = new URLSearchParams(config.params);

                const paramsString = params.toString();
                const fullUrl = paramsString ? `${url}?${paramsString}` : url;

                logger.info(`Encora API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
                return config;
            },
            (error) => {
                logger.error('Encora API Request Error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging
        this.client.interceptors.response.use(
            (response) => {
                logger.info(`Encora API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
                return response;
            },
            (error) => {
                if (error.response) {
                    logger.error(`Encora API Error: ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
                } else {
                    logger.error(`Encora API Network Error: ${error.message}`);
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get recording details
     * @param id - Encora recording ID
     */
    async getRecordingDetails(id: number): Promise<EncoraRecording> {
        const response = await this.client.get<EncoraRecording>(`/recording/${id}`);
        return response.data;
    }

    /**
     * Get recording subtitles
     * @param id - Encora recording ID
     */
    async getRecordingSubtitles(id: number): Promise<import('../types/encora').EncoraSubtitle[]> {
        const response = await this.client.get<import('../types/encora').EncoraSubtitle[]>(`/recording/${id}/subtitles`);
        return response.data;
    }
}
