/**
 * Maps Encora API responses to Plex Metadata models
 */

import {
    MovieMetadata,
    Image,
    Person,
    Genre,
    Subtitle,
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
        subtitles?: EncoraSubtitle[]
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
        })) : [];

        const metadata: MovieMetadata = {
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
            Subtitle: mappedSubtitles.length > 0 ? mappedSubtitles : undefined,
            Role: roles.length > 0 ? roles : undefined,
            Director: recording.master ? [{ tag: recording.master }] : undefined,
            editionTitle: recording.master ? recording.master : undefined,
            Guid: [
                { id: createExternalGuid('encora', recording.id.toString()) }
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
     * Map full language name to ISO 639-2/B code
     */
    private mapLanguage(language: string): string {
        const langMap: Record<string, string> = {
            'English': 'eng',
            'French': 'fre',
            'Spanish': 'spa',
            'Dutch': 'dut',
            'German': 'ger',
            'Portuguese': 'por',
            'Japanese': 'jpn',
            'Russian': 'rus',
            'Czech': 'cze',
            'Korean': 'kor',
            'Hungarian': 'hun',
            'Swedish': 'swe',
            'Polish': 'pol',
            'Danish': 'dan',
            'Norwegian': 'nor',
            'Italian': 'ita',
            'Finnish': 'fin',
            'Hebrew': 'heb',
            'Cantonese': 'chi',
            'Catalan': 'cat',
            'Yiddish': 'yid',
            'American Sign Language': 'sgn',
            'British Sign Language': 'sgn',
            'Switzerland/German': 'ger',
            'Filipino': 'fil',
            'Croatian': 'hrv',
            'Serbian': 'srp',
            'Estonian': 'est',
            'Latvian': 'lav',
            'Lithuanian': 'lit',
            'Romanian': 'rum',
            'Portuguese (BR)': 'por',
            'Greek': 'gre',
            'Spanish (Latin)': 'spa',
            'Mandarin': 'chi',
            'Turkish': 'tur',
            'Slovak': 'slo',
            'Bulgarian': 'bul',
            'Chinese': 'chi',
            'Scots': 'sco',
            'Malay': 'may',
            'Kazakh': 'kaz',
            'Georgian': 'geo',
            'Arabic (Palestinian)': 'ara',
            'Arabic': 'ara',
            'Swahili': 'swa',
            'Albanian': 'alb',
            'Macedonian': 'mac',
            'Ukrainian': 'ukr',
            'Cornish': 'cor',
            'Latin': 'lat',
            'Armenian': 'arm',
        };

        return langMap[language] || language; // Return original if no mapping found
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
            let dateIso = `${year}-${month}-${day}`;
            let dateUsa = `${month}-${day}-${year}`;
            let dateNumeric = `${day}-${month}-${year}`;

            if (dateObj.month_known) {
                const mIndex = parseInt(month, 10) - 1;
                const mName = (mIndex >= 0 && mIndex < 12) ? monthNames[mIndex] : "Unknown";
                dateText += mName;
            } else {
                dateText += replaceChar.repeat(3); // or ???
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
            title = title.replace(/{{date_iso}}/g, dateIso);
            title = title.replace(/{{date_usa}}/g, dateUsa);
            title = title.replace(/{{date_numeric}}/g, dateNumeric);

            return title.trim();
        } catch (e) {
            console.error('Error formatting title:', e);
            return recording.show; // Fallback
        }
    }
}
