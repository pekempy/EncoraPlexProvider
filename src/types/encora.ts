/**
 * TypeScript types for Encora API responses
 */

export interface EncoraDate {
    full_date: string;
    month_known: boolean;
    day_known: boolean;
    date_variant: string | null;
    time: string;
}

export interface EncoraNFT {
    nft_date: string | null;
    nft_forever: boolean;
}

export interface EncoraPerformer {
    id: number;
    name: string;
    slug: string;
    url: string;
}

export interface EncoraCharacter {
    id: number;
    name: string;
    slug: string;
    url: string;
    order: number;
}

export interface EncoraCastMember {
    performer: EncoraPerformer;
    character: EncoraCharacter;
    status: string | null;
}

export interface EncoraMetadata {
    show_id: number;
    is_opening: boolean;
    is_closing: boolean;
    is_preview: boolean;
    is_concert: boolean;
    is_nfs: boolean;
    is_favourite: boolean;
    venue: string;
    city: string;
    media_type: string;
    recording_type: string;
    amount_recorded: string;
    gifting_status: string;
    limited_status: string;
    boot_camp_recommended: boolean;
    has_screenshots: boolean;
    has_subtitles: boolean;
    owners_count: number;
    wanters_count: number;
    show_description: string;
    last_updated: string;
}

export interface EncoraRecording {
    id: number;
    show: string;
    tour: string;
    date: EncoraDate;
    master: string;
    nft: EncoraNFT;
    cast: EncoraCastMember[];
    notes: string;
    master_notes: string | null;
    release_format: string;
    metadata: EncoraMetadata;
}

export interface EncoraSubtitle {
    recording_id: number;
    language: string;
    author: string;
    file_type: string;
    url: string;
}
