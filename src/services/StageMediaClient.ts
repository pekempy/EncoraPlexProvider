
import axios, { AxiosInstance } from 'axios';

export interface StageMediaPerformer {
    id: number;
    url: string;
}

export interface StageMediaResponse {
    performers: StageMediaPerformer[];
    posters?: string[];
}

export class StageMediaClient {
    private client: AxiosInstance;
    private apiKey: string;
    private baseURL = 'https://stagemedia.me/api';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'User-Agent': 'PlexAgent/1.0',
            },
        });

        // Add logging interceptors
        this.client.interceptors.request.use(request => {
            console.log(`[StageMedia] API Request: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
            return request;
        });

        this.client.interceptors.response.use(
            response => {
                console.log(`[StageMedia] API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
                return response;
            },
            error => {
                if (error.response) {
                    console.error(`[StageMedia] API Error: ${error.response.status} ${error.response.statusText}`, error.response.data);
                } else {
                    console.error(`[StageMedia] Network Error: ${error.message}`);
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get images for a show and a list of actors
     * Handles batching of actor IDs
     */
    async getImages(showId: number, actorIds: number[]): Promise<StageMediaResponse> {
        const uniqueIds = [...new Set(actorIds)];
        const batchSize = 50;
        const batches = [];

        for (let i = 0; i < uniqueIds.length; i += batchSize) {
            batches.push(uniqueIds.slice(i, i + batchSize));
        }

        const combinedResponse: StageMediaResponse = {
            performers: [],
            posters: undefined // Will be set by first response if available
        };

        for (const batch of batches) {
            const idsStr = batch.join(',');
            try {
                // Determine URL for logging purposes, though axios params handles it
                console.log(`[StageMedia] Fetching images for show ${showId} and ${batch.length} actors`);

                const response = await this.client.get<StageMediaResponse>('/images', {
                    params: {
                        show_id: showId,
                        actor_ids: idsStr
                    }
                });

                if (response.data.performers) {
                    combinedResponse.performers.push(...response.data.performers);
                }

                // Collect posters from all responses
                if (response.data.posters) {
                    if (!combinedResponse.posters) combinedResponse.posters = [];
                    for (const p of response.data.posters) {
                        if (!combinedResponse.posters.includes(p)) {
                            combinedResponse.posters.push(p);
                        }
                    }
                }

            } catch (error) {
                console.error(`[StageMedia] Failed to fetch batch for show ${showId}:`, error);
                // Continue to next batch even if one fails
            }
        }

        return combinedResponse;
    }
}
