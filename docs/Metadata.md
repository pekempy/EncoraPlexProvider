# Plex Metadata Object Documentation

## Overview

This document describes the JSON response schema for retrieving metadata from a Plex-compatible API provider.

## Response Structure

The response consists of a `MediaContainer` object that wraps `Metadata` objects representing the movie, TV show, season or episode data. For the simplicity of this documentation we will always expect the maximum amount of `Metadata` objects returned to be 1, as we only ever need to be querying a single item at a time for matching and metadata retrieval purposes.

The different metadata types may have specific attributes only returned by that type. e.g. Season and episode types will have some attributes specific to their parent like `parentTitle` which would not be serialized by a movie or TV show type.

### MediaContainer

The root object that contains metadata and pagination information.

| Field | Type | Description |
|-------|------|-------------|
| `offset` | integer | The starting position in the result set (always 0 for single items) |
| `totalSize` | integer | Total number of items in the response (always 1 for single items) |
| `identifier` | string | The provider identifier (e.g., "tv.plex.provider.metadata") |
| `size` | integer | Number of items in the current response (always 1 for single items) |
| `Metadata` | array | Array containing a single movie metadata object |

## Metadata Object

The main object containing all the item information.

### Core Attributes (applicable to all metadata types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ratingKey` | string | Yes | Unique identifier for this metadata item in Plex |
| `key` | string | Yes | API endpoint path to retrieve this metadata |
| `guid` | string | Yes | Global unique identifier in Plex-compatible format. See the 'Guid construction' section. |
| `type` | string | Yes | Content type (`movie`, `show`, `season` or `episode`) |
| `title` | string | Yes | The metadata title, e.g. "Back to the Future" |
| `originallyAvailableAt` | string | Yes | Original release date in ISO 8601 format (YYYY-MM-DD) |
| `thumb` | string | No | A publicly accessible URL to the default poster/thubnail for the item |
| `art` | string | No | A publicly accessible URL to the default background artwork for the item |
| `contentRating` | string | No | Age rating/certification (e.g., "PG", "R", "PG-13"). For non-US ratings please prepend 2-letter country code followed by a forward slash (e.g. za/15) |
| `originalTitle` | string | No | If the request is made for language that is different to the original language of the release, return the title in its original language. |
| `titleSort` | string | No | Returned if the content should be sorted by a different value, e.g. "Quiet Place, A". This will be added automatically by the media server, so its inclusion is only necessary if you require a specific sorting value which the media server does not accommodate. |
| `year` | integer | No | Release year |
| `summary` | string | No | Full plot synopsis |
| `isAdult` | bool | No | Return `true` for explicit/adult content. |

### Movie, TV Show and Episode Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `duration` | integer | No | Runtime in milliseconds |

### Movie and TV Show Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tagline` | string | No | Movie tagline or promotional text |
| `studio` | string | No | Primary production studio |
| `theme` | string | No | A publicly accessible URL to an audio snippet of the item's theme music (MP3 only, preferably keep max length to around 30 seconds) |

### Season and Episode Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `parentRatingKey` | string | Yes | Unique identifier for parent (the TV show for a season and the season for an episode) metadata item in Plex |
| `parentKey` | string | Yes | API endpoint path to retrieve the parent metadata |
| `parentGuid` | string | Yes | Global unique identifier in Plex-compatible format for the parent. See the 'Guid construction' section. |
| `parentType` | string | Yes | the content type of the parent (i.e. `show` for a season, `season` for an episode) |
| `parentTitle` | string | Yes | The metadata title of the parent. |
| `parentThumb` | string | No | A publicly accessible URL to the default poster/thubnail for the parent |
| `index` | integer | Yes | The item index. For a season this is the season number, for an episode it's the episode number |

### Episode Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `grandparentRatingKey` | string | Yes | Unique identifier for grandparent (the TV Show item) metadata item in Plex |
| `grandparentKey` | string | Yes | API endpoint path to retrieve the grandparent metadata |
| `grandparentGuid` | string | Yes | Global unique identifier in Plex-compatible format for the grandparent. See the 'Guid construction' section. |
| `grandparentType` | string | Yes | `show` - the content type of the grandparent |
| `grandparentTitle` | string | Yes | The metadata title of the grandparent e.g. `Adventure Time` |
| `grandparentThumb` | string | No | A publicly accessible URL to the default poster/thubnail for the grandparent |
| `parentIndex` | integer | Yes | The season index, e.g. `8` |

### `Image` Array (Highly Recommended)

Array of all available image assets in various dimensions.

Not all types are required but it is recommended to supply at least "coverPoster" (or "snapshot" for episode items) and "background". "clearLogo" and "backgroundSquare" are also utilized inside Plex client applications for movies and TV shows and should be supplied to provide the best experience for these types.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Image type: "background", "backgroundSquare", "clearLogo", "coverPoster", "snapshot" |
| `url` | string | Yes | Full URL to the image asset |
| `alt` | string | No | Alt text for accessibility (typically movie title) |

### `OriginalImage` Array (Recommended)

The same attributes as `Image` but provides images in the original language of the content if the requested language doesn't match the original language.

### `Genre` Array (Recommended)

Array of genres associated with the content.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | string | Yes | Display name of the genre (e.g. "Action") |
| `originalTag` | string | No | Original language of genre name if request is made in a language different from the original |

### `Guid` Array (Optional)

Array of external identifier mappings. This is very useful to provide exact mappings to other metadata providers which can improve matching accuracy and speed when combining multiple metadata providers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | External ID in format "provider://id" (e.g., "imdb://tt0088763", "tmdb://105") |

Internally supported providers include:
- `imdb` - IMDb
- `tmdb` - TheMovieDB
- `tvdb` - TVDB

### `Collection` Array (Optional)

Array of collections a movie belongs to (currently only supported in movie libraries).

To utilize this properly the provider must have the `collection` feature.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guid` | string | Yes | Unique identifier for the collection |
| `key` | string | Yes | API endpoint to retrieve collection items |
| `tag` | string | Yes | Collection name |
| `summary` | string | No | Description of the collection |
| `art` | string | No | URL to collection background artwork |
| `thumb` | string | No | URL to collection poster/thumbnail |

### `Country` Array (Optional)

Array of production countries.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | string | Yes | Full country name |

### People

There are common attributes among `Role`, `Producer`, `Director` and `Writer` arrays.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | string | Yes | Person's full name |
| `thumb` | string | No | URL to person's photo |
| `role` | string | No | Character name or role description |
| `order` | integer | No | Display order in cast list |

### `Role` Array (Recommended)

Array of cast members and their characters.

See "People" section for attributes.

### `Director` Array (Recommended)

Array of directors.

See "People" section for attributes.

### `Producer` Array (Recommended)

Array of producers.

See "People" section for attributes.

### `Writer` Array (Recommended)

Array of writers/screenwriters.

See "People" section for attributes.

### `Similar` Array (Optional)

Array of similar titles.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guid` | string | Yes | GUID for the similar movie |
| `tag` | string | No | Title of the similar movie |

### `Studio` Array (Optional)

Array of production studios and companies.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | string | Yes | Studio/company name |

### `Rating` Array (Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | Yes | Image identifier for critic rating badge (see supported identifiers below) |
| `type` | string | Yes | `audience` or `critic` - always `audience` for user-generated ratings |
| `value` | float | Yes | The rating represented by a floating point value between 0 and 10 |

#### Rating image identifiers

These are built-in mappings to display the appropriate badge inside the Plex client. Adding new types is not currently supported.

| Identifier | Source |
|------------|--------|
| `imdb://image.rating` | IMDb ratings |
| `themoviedb://image.rating` | TheMovieDb ratings |
| `rottentomatoes://image.rating.ripe` | Rotten Tomatoes for critic ratings |
| `rottentomatoes://image.rating.upright` | Rotten Tomatoes for audience ratings |

### `Network` Array (Optional)

TV Shows only.

Array of television networks that the TV Show originally aired on.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | string | Yes | Network name |

### `SeasonType` Array (Optional)

TV Shows only.

The provider must support the `episodeOrdering` query parameter to use this.

Array of available episode orderings for a specific TV Show e.g. ("DVD Order", "Airing Order", etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the SeasonType, used as query parameter when making requests for TV Shows. ASCII characters only (e.g. "blurayOrder") |
| `source` | string | Yes | The source of the data, e.g. "tmdb" |
| `tag` | string | Yes | A human readable descriptor for the SeasonType, e.g. "Bluray" or "Airing" |
| `title` | string | Yes | A full description for the SeasonType as shown in the Plex UI (e.g. "TheMovieDB (Netflix Order)") |

### `Children` Object

This is required to be supported for TV Shows and Seasons and should only be returned when a request with `includeChildren=1` is passed.

This is a simplified `MediaContainer` object inside a `Metadata` object which provides an array of child items for the parent object (i.e. when requesting a TV Show, `Children` will contain the list of Seasons of that TV Show).

Note: it is expected that all the child objects be returned in this array. In some edge cases this may result in very large arrays. Please see fit to ensure your provider can handle this and simplify the child objects with only the required attributes if necessary.

| Field | Type | Description |
|-------|------|-------------|
| `size` | integer | Number of items in the `Metadata` array |
| `Metadata` | array | Array containing all child `Metadata` objects |

## GUID construction

Plex-compatible GUIDs are constructed out of the following components:

`{scheme}://{metadataType}/{ratingKey}`

For an item from the Plex metadata provider this will look something like this:

`plex://movie/5d7768244de0ee001fcc7fed`

### `Scheme` component

Custom metadata providers need to provide a GUID in this same format using a scheme with the `tv.plex.agents.custom.` prefix. The scheme should match the metadata provider's `identifier` (see [Defining an identifier](MediaProvider.md#defining-an-identifier)), for example a provider for a custom TheMovieDB implementation might use a scheme like:

`tv.plex.agents.custom.johnz.tmdb`

### `metadataType` component

This should just be the string representation of the metadata type being returned, i.e. `movie`, `show`, `season` or `episode`.

### `ratingKey` component

This value should match the `ratingKey` attribute on the metadata item and is what is used when making a metadata request to the provider (e.g. `http://localhost/library/metadata/{ratingKey}`).

The `ratingKey` can constist of ASCII letters, numbers, dashes and underscores (`regex [a-zA-Z0-9_-]`).

### Custom GUID examples

Some valid GUIDs could look like this:

- `tv.plex.agents.custom.johnz.tmdb://movie/tmdb-movie-19934`
- `tv.plex.agents.custom.barkley.tvdb://show/78874`
- `tv.plex.agents.custom.finn.imdb://movie/tt0379786`

## Example Responses

#### Movie Type
```json
{
  "MediaContainer": {
    "offset": 0,
    "totalSize": 1,
    "identifier": "tv.plex.provider.metadata",
    "size": 1,
    "Metadata": [
      {
        "art": "https://metadata-static.plex.tv/d/gracenote/dc6be8ceb098b8e14a708786ea071c6e.jpg",
        "guid": "plex://movie/5d7768244de0ee001fcc7fed",
        "key": "/library/metadata/5d7768244de0ee001fcc7fed",
        "ratingKey": "5d7768244de0ee001fcc7fed",
        "studio": "Universal Pictures",
        "summary": "Marty McFly, a typical American teenager of the Eighties, is accidentally sent back to 1955 in a plutonium-powered DeLorean \"time machine\" invented by a slightly mad scientist. During his often hysterical, always amazing trip back in time, Marty must make sure his teenage parents-to-be meet and fall in love to get back to the future.",
        "tagline": "He was never in time for his classes... He wasn't in time for his dinner... Then one day... he wasn't in his time at all.",
        "type": "movie",
        "thumb": "https://metadata-static.plex.tv/9/gracenote/9cf50a3c04a44ff7d53e1134222e3929.jpg",
        "duration": 6960000,
        "title": "Back to the Future",
        "contentRating": "PG",
        "originallyAvailableAt": "1985-07-03",
        "year": 1985,
        "Image": [
          {
            "alt": "Back to the Future",
            "type": "background",
            "url": "https://metadata-static.plex.tv/d/gracenote/dc6be8ceb098b8e14a708786ea071c6e.jpg"
          },
          {
            "alt": "Back to the Future",
            "type": "backgroundSquare",
            "url": "https://metadata-static.plex.tv/a/gracenote/ab63d5222db8e9b9c319b478f81bf1b6.jpg"
          },
          {
            "alt": "Back to the Future",
            "type": "clearLogo",
            "url": "https://metadata-static.plex.tv/f/683a142553/f44fe9b4a2cb1a6eb3eadbd22eb09add.png"
          },
          {
            "alt": "Back to the Future",
            "type": "coverPoster",
            "url": "https://metadata-static.plex.tv/9/gracenote/9cf50a3c04a44ff7d53e1134222e3929.jpg"
          }
        ],
        "Genre": [
          {
            "tag": "Adventure",
          },
          {
            "tag": "Comedy",
          },
          {
            "tag": "Science Fiction",
          }
        ],
        "Guid": [
          {
            "id": "imdb://tt0088763"
          },
          {
            "id": "tmdb://105"
          },
          {
            "id": "tvdb://299"
          }
        ],
        "Rating": [
          {
            "image": "imdb://image.rating",
            "type": "audience",
            "value": 8.5
          },
          {
            "image": "rottentomatoes://image.rating.ripe",
            "type": "critic",
            "value": 9.3
          },
          {
            "image": "rottentomatoes://image.rating.upright",
            "type": "audience",
            "value": 9.5
          },
          {
            "image": "themoviedb://image.rating",
            "type": "audience",
            "value": 8.321
          }
        ],
        "Collection": [
          {
            "art": "https://image.tmdb.org/t/p/original/c9C9Pg2QctyjZHRmS0P8rZg1OTA.jpg",
            "guid": "plex://collection/5ec2eb574592b6004137f444",
            "key": "/library/collections/5ec2eb574592b6004137f444/children",
            "summary": "An American science fiction–comedy film series that follows the adventures of a high school student, Marty McFly and an eccentric scientist, Dr Emmett L. Brown as they use a DeLorean time machine to time travel to different periods in the history of Hill Valley, California.",
            "thumb": "https://image.tmdb.org/t/p/original/5Xsu2o5IsZRuuxCEVZ9nVve21FP.jpg",
            "tag": "Back to the Future Collection"
          }
        ],
        "Country": [
          {
            "tag": "United States of America"
          }
        ],
        "Role": [
          {
            "order": 1,
            "tag": "Michael J. Fox",
            "thumb": "https://metadata-static.plex.tv/8/people/835031cfa837a2bee58d4c0c345f617b.jpg",
            "role": "Marty McFly"
          },
          {
            "order": 2,
            "tag": "Christopher Lloyd",
            "thumb": "https://metadata-static.plex.tv/2/people/21ab248996f621004036e057a1bad43e.jpg",
            "role": "Emmett Brown"
          },
          {
            "order": 3,
            "tag": "Crispin Glover",
            "thumb": "https://metadata-static.plex.tv/4/people/490bb62cd498add695195a06dd0ca87e.jpg",
            "role": "George McFly"
          },
          {
            "order": 4,
            "tag": "Lea Thompson",
            "thumb": "https://metadata-static.plex.tv/1/people/170afcdfe5b74c88f5ea5f74a31d107d.jpg",
            "role": "Lorraine Baines"
          }
        ],
        "Director": [
          {
            "tag": "Robert Zemeckis",
            "thumb": "https://metadata-static.plex.tv/b/people/b6a7e4d5e61c2c4613be3ece75dace8e.jpg",
            "role": "Director"
          }
        ],
        "Producer": [
          {
            "tag": "Neil Canton",
            "thumb": "https://metadata-static.plex.tv/4/people/481b0c2f5f012c3a532e2bf48fef1d80.jpg",
            "role": "Producer"
          },
          {
            "tag": "Bob Gale",
            "thumb": "https://metadata-static.plex.tv/people/5d7768244de0ee001fcc80b8.jpg",
            "role": "Producer"
          }
        ],
        "Writer": [
          {
            "tag": "Robert Zemeckis",
            "thumb": "https://metadata-static.plex.tv/b/people/b6a7e4d5e61c2c4613be3ece75dace8e.jpg",
            "role": "Writer"
          },
          {
            "tag": "Bob Gale",
            "thumb": "https://metadata-static.plex.tv/people/5d7768244de0ee001fcc80b8.jpg",
            "role": "Writer"
          }
        ],
        "Similar": [
          {
            "guid": "plex://movie/5d776d1023d5a3001f52001d",
            "tag": "Back to the Future Part II"
          },
          {
            "guid": "plex://movie/5d776d1723d5a3001f520400",
            "tag": "The Karate Kid"
          },
          {
            "guid": "plex://movie/5d776d10fb0d55001f596237",
            "tag": "Back to the Future Part III"
          },
          {
            "guid": "plex://movie/5d77682a6f4521001ea99e2c",
            "tag": "The Breakfast Club"
          }
        ],
        "Studio": [
          {
            "tag": "Universal Pictures"
          },
          {
            "tag": "Amblin Entertainment"
          }
        ]
      }
    ]
  }
}
```

#### Show Type

```json
{
  "MediaContainer": {
    "offset": 0,
    "totalSize": 1,
    "identifier": "tv.plex.provider.metadata",
    "size": 1,
    "Metadata": [
      {
        "art": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg",
        "guid": "plex://show/5d9c07f72df347001e3a70b4",
        "key": "/library/metadata/5d9c07f72df347001e3a70b4/children",
        "ratingKey": "5d9c07f72df347001e3a70b4",
        "studio": "Frederator Studios",
        "summary": "Unlikely heroes Finn and Jake are buddies who traverse the mystical Land of Ooo. The best of friends, our heroes always find themselves in the middle of escapades. Finn and Jake depend on each other through thick and thin.",
        "type": "show",
        "theme": "https://tvthemes.plexapp.com/152831.mp3",
        "thumb": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg",
        "duration": 660000,
        "title": "Adventure Time",
        "contentRating": "TV-PG",
        "originallyAvailableAt": "2010-04-05",
        "year": 2010,
        "Image": [
          {
            "alt": "Adventure Time",
            "type": "background",
            "url": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg"
          },
          {
            "alt": "Adventure Time",
            "type": "backgroundSquare",
            "url": "https://metadata-static.plex.tv/1/gracenote/1c09b028e1b15c0325917c51966a47d7.jpg"
          },
          {
            "alt": "Adventure Time",
            "type": "clearLogo",
            "url": "https://metadata-static.plex.tv/9/683a142553/9bf0c95f0dede66fce0e507fbfedc653.png"
          },
          {
            "alt": "Adventure Time",
            "type": "coverPoster",
            "url": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg"
          }
        ],
        "Genre": [
          {
            "tag": "Animation"
          },
          {
            "tag": "Comedy"
          },
          {
            "tag": "Action"
          },
          {
            "tag": "Adventure"
          },
          {
            "tag": "Family"
          },
          {
            "tag": "Fantasy"
          },
          {
            "tag": "Science Fiction"
          },
          {
            "tag": "Sci-Fi & Fantasy"
          },
          {
            "tag": "Children"
          }
        ],
        "Guid": [
          {
            "id": "imdb://tt1305826"
          },
          {
            "id": "tmdb://15260"
          },
          {
            "id": "tvdb://152831"
          }
        ],
        "Rating": [
          {
            "image": "imdb://image.rating",
            "type": "audience",
            "value": 8.6
          },
          {
            "image": "rottentomatoes://image.rating.ripe",
            "type": "critic",
            "value": 10
          },
          {
            "image": "rottentomatoes://image.rating.upright",
            "type": "audience",
            "value": 9.4
          },
          {
            "image": "themoviedb://image.rating",
            "type": "audience",
            "value": 8.504
          }
        ],
        "Country": [
          {
            "tag": "United States of America"
          }
        ],
        "Role": [
          {
            "order": 1,
            "tag": "Jeremy Shada",
            "thumb": "https://metadata-static.plex.tv/b/people/ba6413846e4fc49884ec7694d012b198.jpg",
            "role": "Finn the Human (voice)"
          },
          {
            "order": 2,
            "tag": "John DiMaggio",
            "thumb": "https://metadata-static.plex.tv/0/people/0a945543418d442fea7ae4948b2a2fda.jpg",
            "role": "Jake the Dog (voice)"
          },
          {
            "order": 3,
            "tag": "Tom Kenny",
            "thumb": "https://metadata-static.plex.tv/7/people/7a7654471f4b87c2f8ce757357e860b5.jpg",
            "role": "Ice King (voice)"
          },
          {
            "order": 4,
            "tag": "Hynden Walch",
            "thumb": "https://metadata-static.plex.tv/b/people/b2588be9b38393facd27de7fc4081720.jpg",
            "role": "Princess Bubblegum (voice)"
          },
          {
            "order": 5,
            "tag": "Olivia Olson",
            "thumb": "https://metadata-static.plex.tv/4/people/4eec0b6c6d36f6c4cd0574af354d74aa.jpg",
            "role": "Marceline the Vampire Queen (voice)"
          }
        ],
        "Director": [
          {
            "tag": "Larry Leichliter",
            "role": "Director"
          },
          {
            "tag": "Adam Muto",
            "thumb": "https://metadata-static.plex.tv/e/people/e385c2d25614f10d505701e5f590372a.jpg",
            "role": "Director"
          }
        ],
        "Producer": [
          {
            "tag": "Derek Drymon",
            "thumb": "https://metadata-static.plex.tv/c/people/cb057ffd3860076eb0f0c1fb55c8fef1.jpg",
            "role": "Producer"
          },
          {
            "tag": "Kelly Crews",
            "role": "Producer"
          }
        ],
        "Writer": [
          {
            "tag": "Tim McKeon",
            "role": "Writer"
          },
          {
            "tag": "Sean Jimenez",
            "role": "Writer"
          }
        ],
        "Network": [
          {
            "tag": "Cartoon Network"
          }
        ],
        "SeasonType": [
          {
            "id": "tmdbAiring",
            "source": "tmdb",
            "tag": "Aired",
            "title": "The Movie Database (Aired)"
          },
          {
            "id": "tvdbAiring",
            "source": "tvdb",
            "tag": "Aired",
            "title": "TheTVDB (Aired)"
          },
          {
            "id": "tvdbDvd",
            "source": "tvdb",
            "tag": "DVD",
            "title": "TheTVDB (DVD)"
          },
          {
            "id": "tvdbAbsolute",
            "source": "tvdb",
            "tag": "Absolute",
            "title": "TheTVDB (Absolute)"
          }
        ],
        "Similar": [
          {
            "guid": "plex://show/611cdc357032b6002cb92e97",
            "tag": "Adventure Time: Fionna & Cake"
          },
          {
            "guid": "plex://show/5d9c0875ba6eb9001fba4e43",
            "tag": "Johnny Bravo"
          },
          {
            "guid": "plex://show/5d9c084de264b7001fc4088c",
            "tag": "Regular Show"
          }
        ],
        "Studio": [
          {
            "tag": "Frederator Studios"
          },
          {
            "tag": "Cartoon Network Studios"
          }
        ]
      }
    ]
  }
}
```

#### Season Type (with `Children`)

```json
{
  "MediaContainer": {
    "offset": 0,
    "totalSize": 1,
    "identifier": "tv.plex.provider.metadata",
    "size": 1,
    "Metadata": [
      {
        "guid": "plex://season/602e59ccfdd281002cddb790",
        "key": "/library/metadata/602e59ccfdd281002cddb790/children",
        "ratingKey": "602e59ccfdd281002cddb790",
        "type": "season",
        "thumb": "http://assets.fanart.tv/fanart/tv/152831/seasonposter/adventure-time-with-finn-and-jake-5c8d180f9b002.jpg",
        "title": "Season 10",
        "parentTitle": "Adventure Time",
        "parentType": "show",
        "parentArt": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg",
        "parentThumb": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg",
        "parentRatingKey": "5d9c07f72df347001e3a70b4",
        "parentGuid": "plex://show/5d9c07f72df347001e3a70b4",
        "parentKey": "/library/metadata/5d9c07f72df347001e3a70b4",
        "index": 10,
        "contentRating": "TV-PG",
        "originallyAvailableAt": "2017-09-17",
        "year": 2017,
        "Image": [
          {
            "alt": "Season 10",
            "type": "background",
            "url": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg"
          },
          {
            "alt": "Season 10",
            "type": "backgroundSquare",
            "url": "https://metadata-static.plex.tv/1/gracenote/1c09b028e1b15c0325917c51966a47d7.jpg"
          },
          {
            "alt": "Season 10",
            "type": "coverPoster",
            "url": "http://assets.fanart.tv/fanart/tv/152831/seasonposter/adventure-time-with-finn-and-jake-5c8d180f9b002.jpg"
          }
        ],
        "Guid": [
          {
            "id": "tvdb://1823714"
          }
        ],
        "Children": {
          "size": 2,
          "Metadata": [
            {
              "guid": "plex://episode/5d9c0b7ee98e47001eb2e3a0",
              "key": "/library/metadata/5d9c0b7ee98e47001eb2e3a0",
              "ratingKey": "5d9c0b7ee98e47001eb2e3a0",
              "summary": "A fierce creature is terrorizing the Candy Kingdom but before Finn can slay the beast, he must first overcome a guilty conscience.",
              "type": "episode",
              "thumb": "https://image.tmdb.org/t/p/original/qgKsxcwvkDbAIjUceuDrv2AgtOF.jpg",
              "duration": 660000,
              "title": "The Wild Hunt",
              "grandparentTitle": "Adventure Time",
              "grandparentType": "show",
              "grandparentArt": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg",
              "grandparentThumb": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg",
              "grandparentRatingKey": "5d9c07f72df347001e3a70b4",
              "grandparentGuid": "plex://show/5d9c07f72df347001e3a70b4",
              "grandparentKey": "/library/metadata/5d9c07f72df347001e3a70b4",
              "parentTitle": "Season 10",
              "parentType": "season",
              "parentArt": "https://metadata-static.plex.tv/9/gracenote/9e06ae7ff36bd8d62fa1600287f80794.jpg",
              "parentThumb": "https://image.tmdb.org/t/p/original/w8mYplN3ysIJ5DIYYgmfGTvuNzd.jpg",
              "parentRatingKey": "5d9c0939e9d5a1001f4def80",
              "parentGuid": "plex://season/5d9c0939e9d5a1001f4def80",
              "parentKey": "/library/metadata/5d9c0939e9d5a1001f4def80",
              "index": 1,
              "parentIndex": 10,
              "contentRating": "TV-PG",
              "originallyAvailableAt": "2017-09-17",
              "year": 2017,
              "Image": [
                {
                  "alt": "The Wild Hunt",
                  "type": "snapshot",
                  "url": "https://image.tmdb.org/t/p/original/qgKsxcwvkDbAIjUceuDrv2AgtOF.jpg"
                }
              ],
              "Guid": [
                {
                  "id": "imdb://tt7308394"
                },
                {
                  "id": "tmdb://1418023"
                },
                {
                  "id": "tvdb://6179251"
                }
              ],
              "Rating": [
                {
                  "image": "imdb://image.rating",
                  "type": "audience",
                  "value": 8.3
                },
                {
                  "image": "themoviedb://image.rating",
                  "type": "audience",
                  "value": 7.9
                }
              ],
              "Role": [
                {
                  "order": 1,
                  "tag": "Jeremy Shada",
                  "thumb": "https://metadata-static.plex.tv/b/people/ba6413846e4fc49884ec7694d012b198.jpg",
                  "role": "Finn the Human (voice)"
                },
                {
                  "order": 2,
                  "tag": "John DiMaggio",
                  "thumb": "https://metadata-static.plex.tv/0/people/0a945543418d442fea7ae4948b2a2fda.jpg",
                  "role": "Jake the Dog (voice)"
                }
              ],
              "Producer": [
                {
                  "tag": "Adam Muto",
                  "thumb": "https://metadata-static.plex.tv/e/people/e385c2d25614f10d505701e5f590372a.jpg",
                  "role": "Producer"
                }
              ],
              "Writer": [
                {
                  "tag": "Pendleton Ward",
                  "thumb": "https://metadata-static.plex.tv/8/people/83eb3402f017498e3a0fd5e44af8d1ae.jpg",
                  "role": "Creator"
                }
              ]
            },
            {
              "guid": "plex://episode/5d9c0b7ee98e47001eb2e38b",
              "key": "/library/metadata/5d9c0b7ee98e47001eb2e38b",
              "ratingKey": "5d9c0b7ee98e47001eb2e38b",
              "summary": "BMO and Ice King hit the road as door to door salesmen and stumble upon an irresistible opportunity.",
              "type": "episode",
              "thumb": "https://image.tmdb.org/t/p/original/fvREJ2bNoXM2WAGVPCGa3ryQtJs.jpg",
              "duration": 660000,
              "title": "Always BMO Closing",
              "grandparentTitle": "Adventure Time",
              "grandparentType": "show",
              "grandparentArt": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg",
              "grandparentThumb": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg",
              "grandparentRatingKey": "5d9c07f72df347001e3a70b4",
              "grandparentGuid": "plex://show/5d9c07f72df347001e3a70b4",
              "grandparentKey": "/library/metadata/5d9c07f72df347001e3a70b4",
              "parentTitle": "Season 10",
              "parentType": "season",
              "parentArt": "https://metadata-static.plex.tv/9/gracenote/9e06ae7ff36bd8d62fa1600287f80794.jpg",
              "parentThumb": "https://image.tmdb.org/t/p/original/w8mYplN3ysIJ5DIYYgmfGTvuNzd.jpg",
              "parentRatingKey": "5d9c0939e9d5a1001f4def80",
              "parentGuid": "plex://season/5d9c0939e9d5a1001f4def80",
              "parentKey": "/library/metadata/5d9c0939e9d5a1001f4def80",
              "index": 2,
              "parentIndex": 10,
              "contentRating": "TV-PG",
              "originallyAvailableAt": "2017-09-17",
              "year": 2017,
              "Image": [
                {
                  "alt": "Always BMO Closing",
                  "type": "snapshot",
                  "url": "https://image.tmdb.org/t/p/original/fvREJ2bNoXM2WAGVPCGa3ryQtJs.jpg"
                }
              ],
              "Guid": [
                {
                  "id": "imdb://tt7308402"
                },
                {
                  "id": "tmdb://1418024"
                },
                {
                  "id": "tvdb://6305580"
                }
              ],
              "Rating": [
                {
                  "image": "imdb://image.rating",
                  "type": "audience",
                  "value": 7.6
                },
                {
                  "image": "themoviedb://image.rating",
                  "type": "audience",
                  "value": 6.7
                }
              ],
              "Role": [
                {
                  "order": 1,
                  "tag": "Jeremy Shada",
                  "thumb": "https://metadata-static.plex.tv/b/people/ba6413846e4fc49884ec7694d012b198.jpg",
                  "role": "Finn the Human (voice)"
                },
                {
                  "order": 2,
                  "tag": "John DiMaggio",
                  "thumb": "https://metadata-static.plex.tv/0/people/0a945543418d442fea7ae4948b2a2fda.jpg",
                  "role": "Jake the Dog (voice)"
                }
              ],
              "Producer": [
                {
                  "tag": "Adam Muto",
                  "thumb": "https://metadata-static.plex.tv/e/people/e385c2d25614f10d505701e5f590372a.jpg",
                  "role": "Producer"
                }
              ],
              "Writer": [
                {
                  "tag": "Pendleton Ward",
                  "thumb": "https://metadata-static.plex.tv/8/people/83eb3402f017498e3a0fd5e44af8d1ae.jpg",
                  "role": "Creator"
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

#### Episode Type

```json
{
  "MediaContainer": {
    "offset": 0,
    "totalSize": 1,
    "identifier": "tv.plex.provider.metadata",
    "size": 1,
    "Metadata": [
      {
        "guid": "plex://episode/5d9c0b7ee98e47001eb2e3a0",
        "key": "/library/metadata/5d9c0b7ee98e47001eb2e3a0",
        "ratingKey": "5d9c0b7ee98e47001eb2e3a0",
        "summary": "A fierce creature is terrorizing the Candy Kingdom but before Finn can slay the beast, he must first overcome a guilty conscience.",
        "type": "episode",
        "thumb": "https://image.tmdb.org/t/p/original/qgKsxcwvkDbAIjUceuDrv2AgtOF.jpg",
        "duration": 660000,
        "title": "The Wild Hunt",
        "grandparentTitle": "Adventure Time",
        "grandparentType": "show",
        "grandparentArt": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg",
        "grandparentThumb": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg",
        "grandparentRatingKey": "5d9c07f72df347001e3a70b4",
        "grandparentGuid": "plex://show/5d9c07f72df347001e3a70b4",
        "grandparentKey": "/library/metadata/5d9c07f72df347001e3a70b4",
        "parentTitle": "Season 10",
        "parentType": "season",
        "parentArt": "https://metadata-static.plex.tv/9/gracenote/9e06ae7ff36bd8d62fa1600287f80794.jpg",
        "parentThumb": "https://image.tmdb.org/t/p/original/w8mYplN3ysIJ5DIYYgmfGTvuNzd.jpg",
        "parentRatingKey": "5d9c0939e9d5a1001f4def80",
        "parentGuid": "plex://season/5d9c0939e9d5a1001f4def80",
        "parentKey": "/library/metadata/5d9c0939e9d5a1001f4def80",
        "index": 1,
        "parentIndex": 10,
        "contentRating": "TV-PG",
        "originallyAvailableAt": "2017-09-17",
        "year": 2017,
        "Image": [
          {
            "alt": "The Wild Hunt",
            "type": "snapshot",
            "url": "https://image.tmdb.org/t/p/original/qgKsxcwvkDbAIjUceuDrv2AgtOF.jpg"
          }
        ],
        "Guid": [
          {
            "id": "imdb://tt7308394"
          },
          {
            "id": "tmdb://1418023"
          },
          {
            "id": "tvdb://6179251"
          }
        ],
        "Rating": [
          {
            "image": "imdb://image.rating",
            "type": "audience",
            "value": 8.3
          },
          {
            "image": "themoviedb://image.rating",
            "type": "audience",
            "value": 7.9
          }
        ],
        "Role": [
          {
            "order": 1,
            "tag": "Jeremy Shada",
            "thumb": "https://metadata-static.plex.tv/b/people/ba6413846e4fc49884ec7694d012b198.jpg",
            "role": "Finn the Human (voice)"
          },
          {
            "order": 2,
            "tag": "John DiMaggio",
            "thumb": "https://metadata-static.plex.tv/0/people/0a945543418d442fea7ae4948b2a2fda.jpg",
            "role": "Jake the Dog (voice)"
          }
        ],
        "Producer": [
          {
            "tag": "Adam Muto",
            "thumb": "https://metadata-static.plex.tv/e/people/e385c2d25614f10d505701e5f590372a.jpg",
            "role": "Producer"
          }
        ],
        "Writer": [
          {
            "tag": "Pendleton Ward",
            "thumb": "https://metadata-static.plex.tv/8/people/83eb3402f017498e3a0fd5e44af8d1ae.jpg",
            "role": "Creator"
          }
        ]
      }
    ]
  }
}

```