/**
 * Maps Encora API responses to Plex Metadata models
 */

import {
    MovieMetadata,
    Image,
    Person,
    Genre,
    Subtitle,
    Media,
} from '../models/Metadata';
import { EncoraRecording, EncoraSubtitle } from '../types/encora';
import { StageMediaResponse } from '../services/StageMediaClient';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { constructMetadataKey, constructGuid, createExternalGuid } from '../utils/guid';
import { config } from '../config/env';

export class EncoraMapper {

    /**
     * Map Encora Recording to Plex MovieMetadata
     */
    mapRecording(
        recording: EncoraRecording,
        stageMediaImages?: StageMediaResponse,
        subtitles?: EncoraSubtitle[],
        filename?: string
    ): MovieMetadata {
        const ratingKey = `encora-recording-${recording.id}`;

        // Create performer URL map
        const performerUrlMap: Record<number, string> = {};
        if (stageMediaImages?.performers) {
            for (const performer of stageMediaImages.performers) {
                performerUrlMap[performer.id] = performer.url;
            }
        }

        // Map cast
        const roles: Person[] = recording.cast.map(member => {
            const url = performerUrlMap[member.performer.id] || member.performer.url;
            return {
                tag: member.performer.name,
                role: member.character.name,
                thumb: url || "https://i.ibb.co/xSHDBZDp/c-Xq-YZEu.png", // Default placeholder if no image
            };
        });

        // Determine content rating (NFT status)
        let contentRating: string | undefined = undefined;
        if (recording.nft) {
            if (recording.nft.nft_forever) {
                contentRating = 'NFT';
            } else if (recording.nft.nft_date) {
                const nftDate = new Date(recording.nft.nft_date);
                const now = new Date();
                if (nftDate > now) {
                    contentRating = 'NFT';
                }
            }
        }

        // Map genres
        const genres: Genre[] = [];
        if (recording.metadata.recording_type) {
            genres.push({ tag: recording.metadata.recording_type });
        }
        if (recording.metadata.media_type) {
            genres.push({ tag: recording.metadata.media_type });
        }

        // Map images (posters)
        const images: Image[] = [];
        if (stageMediaImages?.posters) {
            for (const posterUrl of stageMediaImages.posters) {
                images.push({
                    type: 'coverPoster',
                    url: posterUrl,
                    alt: recording.show
                });
            }
        }

        // Map subtitles
        const mappedSubtitles: Subtitle[] = subtitles ? subtitles.map(sub => ({
            id: sub.url,
            language: this.mapLanguage(sub.language),
            format: sub.file_type.toLowerCase(),
            forced: sub.author === 'Forced',
        })) : [];

        // Construct Media object for modern Plex agent support
        const media: Media[] = [];
        if (filename && subtitles && subtitles.length > 0) {
            const videoFilename = filename.split('/').pop() || filename;
            const baseName = videoFilename.substring(0, videoFilename.lastIndexOf('.')) || videoFilename;

            media.push({
                Part: [{
                    key: filename, // Use the exact key Plex sent us
                    file: filename.startsWith('/') ? filename : filename, // Keep absolute if provided
                    container: filename.split('.').pop()?.toLowerCase() || 'mp4',
                    Stream: (subtitles || []).map((sub, index) => ({
                        id: 1000 + index,
                        streamType: 3,
                        codec: 'srt',
                        language: this.mapLanguage(sub.language),
                        languageTag: this.mapLanguage(sub.language),
                        languageCode: this.mapLanguage(sub.language) === 'en' ? 'eng' : 'und',
                        url: sub.url,
                        format: 'srt',
                        title: sub.author === 'Local' ? `Local - ${sub.language}` : `Encora - ${sub.author}`,
                        forced: sub.author === 'Forced',
                        transient: 1,
                        streamIdentifier: (1000 + index).toString(),
                        canAutoSync: 0
                    }))
                }]
            });
        }

        const metadata: any = {
            type: 'movie',
            ratingKey: ratingKey,
            key: constructMetadataKey(ratingKey),
            guid: constructGuid(MOVIE_PROVIDER_IDENTIFIER, 'movie', ratingKey),
            title: this.formatTitle(recording),
            contentRating,
            originalTitle: recording.tour ? `${recording.show} - ${recording.tour}` : undefined,
            originallyAvailableAt: recording.date.full_date,
            year: recording.date.full_date ? new Date(recording.date.full_date).getFullYear() : undefined,
            summary: this.sanitizeHtml(recording.metadata.show_description) || this.sanitizeHtml(recording.master_notes) || this.sanitizeHtml(recording.notes),
            studio: recording.tour,
            thumb: images.length > 0 ? images[0].url : undefined,
            art: undefined,
            Image: images.length > 0 ? images : undefined,
            Genre: genres.length > 0 ? genres : undefined,
            Subtitle: (subtitles || []).map((s, i) => ({
                id: 1000 + i,
                key: s.url, // Point to our proxy URL
                language: this.mapLanguage(s.language) === 'en' ? 'English' : s.language,
                languageTag: this.mapLanguage(s.language),
                languageCode: this.mapLanguage(s.language) === 'en' ? 'eng' : 'und',
                format: 'srt',
                forced: s.author === 'Forced',
                title: s.author === 'Local' ? 'Local' : `Encora (${s.author})`
            })),
            Role: roles.length > 0 ? roles : undefined,
            Actor: roles.length > 0 ? roles : undefined,
            Director: recording.master ? [{ tag: recording.master }] : undefined,
            editionTitle: recording.master ? recording.master : undefined,
            Guid: [
                { id: createExternalGuid('encora', recording.id.toString()) },
                { id: `tmdb://encora-${recording.id}` }
            ],
            Media: [
                {
                    id: 1,
                    Part: [{
                        id: 1,
                        Stream: (subtitles || []).map((sub, index) => ({
                            id: 1000 + index,
                            streamType: 3,
                            selected: true, // Priority flag
                            codec: 'srt',
                            language: this.mapLanguage(sub.language),
                            languageTag: this.mapLanguage(sub.language),
                            languageCode: this.mapLanguage(sub.language) === 'en' ? 'eng' : 'und',
                            url: sub.url,
                            format: 'srt',
                            title: sub.author === 'Local' ? 'Local' : `Encora (${sub.author})`,
                            transient: 1
                        }))
                    }]
                }
            ],
            Studio: recording.metadata.venue ? [{ tag: recording.metadata.venue }] : undefined,
            Country: recording.metadata.city ? [{ tag: recording.metadata.city }] : undefined,
        };
        return metadata;
    }

    /**
     * Remove HTML tags from string
     */
    private sanitizeHtml(html: string | null | undefined): string | undefined {
        if (!html) return undefined;
        return html.replace(/<[^>]*>?/gm, '')
            .trim();
    }

    /**
     * Map full language name or code to ISO 639-1 code (2-letter)
     */
    public mapLanguage(language: string): string {
        if (!language) return 'und';

        const lang = language.toLowerCase().trim();

        // Direct mapping
        if (lang === 'english' || lang === 'en' || lang === 'eng') return 'en';
        if (lang === 'french' || lang === 'fr' || lang === 'fra') return 'fr';
        if (lang === 'spanish' || lang === 'es' || lang === 'spa') return 'es';
        if (lang === 'dutch' || lang === 'nl' || lang === 'nld') return 'nl';
        if (lang === 'german' || lang === 'de' || lang === 'deu' || lang === 'ger') return 'de';
        if (lang === 'italian' || lang === 'it' || lang === 'ita') return 'it';
        if (lang === 'portuguese' || lang === 'pt' || lang === 'por') return 'pt';
        if (lang === 'japanese' || lang === 'ja' || lang === 'jpn') return 'ja';
        if (lang === 'russian' || lang === 'ru' || lang === 'rus') return 'ru';

        const langMap: Record<string, string> = {
            'english': 'en',
            'french': 'fr',
            'spanish': 'es',
            'dutch': 'nl',
            'german': 'de',
            'portuguese': 'pt',
            'japanese': 'ja',
            'russian': 'ru',
            'czech': 'cs',
            'korean': 'ko',
            'italian': 'it',
            'chinese': 'zh'
        };

        return langMap[lang] || (lang.length === 2 ? lang : 'und');
    }

    /**
     * Format title based on configuration template
     */
    private formatTitle(recording: EncoraRecording): string {
        try {
            const format = config.formatting.titleFormat;
            const replaceChar = config.formatting.dateReplaceChar;

            // Date parsing
            const dateObj = recording.date;
            let year = '????';
            let month = '??';
            let day = '??';

            if (dateObj.full_date) {
                const parts = dateObj.full_date.split('-');
                if (parts.length === 3) {
                    year = parts[0];
                    month = dateObj.month_known ? parts[1] : replaceChar.repeat(2);
                    day = dateObj.day_known ? parts[2] : replaceChar.repeat(2);
                }
            }

            // Month names for {{date}} text format
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

            let dateText = "";
            let dateIsoValue = `${year}-${month}-${day}`;
            let dateUsa = `${month}-${day}-${year}`;
            let dateNumeric = `${day}-${month}-${year}`;

            if (dateObj.month_known) {
                const mIndex = parseInt(month, 10) - 1;
                const mName = (mIndex >= 0 && mIndex < 12) ? monthNames[mIndex] : "Unknown";
                dateText += mName;
            } else {
                dateText += replaceChar.repeat(3);
            }

            dateText += " ";
            dateText += day;
            dateText += ", ";
            dateText += year;

            let title = format;
            title = title.replace(/{{show}}/g, recording.show || '');
            title = title.replace(/{{tour}}/g, recording.tour || '');
            title = title.replace(/{{master}}/g, recording.master || '');
            title = title.replace(/{{date}}/g, dateText);
            title = title.replace(/{{date_iso}}/g, dateIsoValue);
            title = title.replace(/{{date_usa}}/g, dateUsa);
            title = title.replace(/{{date_numeric}}/g, dateNumeric);

            return title.trim();

            return title.trim();
        } catch (e) {
            console.error('Error formatting title:', e);
            return recording.show; // Fallback
        }
    }
}
