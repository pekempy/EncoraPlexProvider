# Plex Media Provider API Documentation

## Overview

This document assumes you are familiar with the [MediaProvider](MediaProvider.md) and [Metadata](Metadata.md) objects which are defined in the linked documents.

Here we will describe the implementation of the various Media Provider features/endpoints.

### Common Request Headers

There are a few headers which are common to both the Metadata and Match features. These can be passed as either headers or query parameters.

| Header | Support Required? | Description |
|--------|-------------------|-------------|
| X-Plex-Language | No | IETF language tag including the region subtag (e.g. 'en-US', 'de-DE'). Used for localization.
| X-Plex-Country | No | ISO 3166 two-letter country code. Used primarily to define the country for certification data, or can be used to determine release dates for the specific country.
| X-Plex-Container-Size | Yes | For paged requests. This determines what the maximum container size should be of a single response.
| X-Plex-Container-Start | Yes | For paged requests. This determines the starting index for the paged request.

### Response Paging

Certain responses may contain a large number of objects. The consumer may want to limit the size of the MediaContainer by paging through them using the `X-Plex-Container-Size` and `X-Plex-Container-Start` headers/params. Responses should them limit the object count inside the MediaContainer to `X-Plex-Container-Size` and start at the index provided by `X-Plex-Container-Start`.

The MediaContainer `totalSize` attribute should represent the size of all objects while the `size` should be only for the number of objects in that one request.

The default page size if the size is not provided should be 20. And the default start if no start is provided will always be the 1 (the first item).

The only two endpoints that require mandatory paging are the Metadata `/children` and `/grandchildren` endpoints as these will potentially contain many items. Passing no paging headers here will only return the first 20.

### Common return codes

It is important to return the correct HTTP return codes.

| Code | Common Name | Description |
|------|-------------|-------------|
| 200 | OK | An response for an item or match is successfully returned |
| 404 | Not Found | If an item with the requested ratingKey is not found (Metadata feature only) |
| 400 | Bad Request | A request was made which cannot be fulfilled because the request is malformed |
| 500 | Internal Server Error | A request was made which cannot be fulfilled because the server encountered an internal error |

### Response Customization (Optional)

There may be cases where a reduced response is wanted, i.e. we only want to return specific attributes or exclude specific attributes. These are handled with `includeFields`, `excludeFields`, `includeElements` and `excludeElements`.

Information on its use can be found in the [Plex Media Server Documentation](https://developer.plex.tv/pms/#section/API-Info/Response-Customization).

You may wish to add support for this to keep response sizes down, however it is not required and you can safely ignore when these parameters are passed.

### Metadata Feature

This is a path to retrieve metadata for a specific piece of content by its id.

It is called by making a `GET` request to the path defined by the `Metadata` feature inside the root of your provider with the `ratingKey` of the metadata item.

For example, the request may be something like `GET http://localhost/library/metadata/tmdb-movie-123` which should return a [Metadata Object](Metadata.md) for the item with the `ratingKey` of "tmdb-movie-123".

See some [Example Responses](Metadata.md#example-responses)

#### Supported Query Parameters

There are some query parameters available to media provider to augment the responses. Not all of these are required to be supported by all providers, support requirement is detailed in the below table.

| Param | Type | Support Required? | Description |
|-------|------|-------------------|-------------|
| `includeChildren` | integer (1/0) | Yes (TV Shows/Seasons only) | Returns a [Children Object](Metadata.md#children-object) when the metadata type has direct child objects (e.g. a TV Show should return Season Children)
| `episodeOrder` | string | No | When making a request that returns seasons in the response, pass back the appropriate season items for the requested [SeasonType id](Metadata.md#seasontype-array-optional). It is expected that if no seasons exist for the requested episodeOrder, that no season data should be returned.

#### Image endpoint (Recommended)

The Metadata feature should also provide a `/images` path for calls to specific items, e.g. `/library/metadata/tmdb-movie-123/images`. This endpoint should return a [MediaContainer](Metadata.md#mediacontainer) object containing and [Image Array](Metadata.md#image-array-highly-recommended) of all the available image assets for that item.

Example:

```json
{
  "MediaContainer": {
    "offset": 0,
    "totalSize": 3,
    "identifier": "tv.plex.provider.metadata",
    "size": 3,
    "Image": [
      {
        "type": "coverPoster",
        "url": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg",
      },
      {
        "type": "background",
        "url": "https://image.tmdb.org/t/p/original/3uE9SUywNbj1qSAuYCGgbTTYku5.jpg",
      },
      {
        "type": "clearLogo",
        "url": "https://image.tmdb.org/t/p/original/rIi0lY2UftYuKDJ4OlIefDdijve.png",
      }
    ]
  }
}
```

### Children and Grandchildren Requests

For items which contain child items, like TV Shows and Seasons, these types should also respond to requests for `/children` and `/grandchildren`, e.g. `/library/metadata/tmdb-show-123/children`.

For TV Shows and Seasons this should return a [MediaContainer](Metadata.md#mediacontainer) object with an array of [Metadata Objects](Metadata.md#metadata-object) for their Seasons and Episodes respectively.

It is required that these two endpoints support paged requests via the `X-Plex-Container-Size` and `X-Plex-Container-Start` headers/params.

### Match Feature

This is a path to retrieve potential matches to metadata items based on contextual hints passed in your request body. This should return a [MediaContainer Object](Metadata.md#mediacontainer) possibly containing multiple Metadata objects (by default should only return the best result only).

It is called by making a `POST` request to the path defined by the `Match` feature inside the root of your provider.

This may be where it is useful supporting [Response Customization](#response-customization-optional) as match responses don't always need to contain the full Metadata object responses.

A request body is required which can contain the attributes listed below.

| Attribute | Type | Support Required? | Optional | Description |
|-----------|------|-------------------|----------|-------------|
| `type` | integer | Yes | No | The numeric metadata type for the requested match. See [Metadata Types Table](MediaProvider.md#metadata-types-table) |
| `title` | string | Yes | No* | A title for the item. *Movies and TV Shows only. |
| `parentTitle` | string | Yes | No* | A title for the TV Show. *Seasons only. |
| `grandparentTitle` | string | Yes | No* | A title for the TV Show. *Episodes only. |
| `includeChildren` | integer (1/0) | Yes (TV Shows/Seasons only) | Yes* | Returns a [Children Object](Metadata.md#children-object) when the metadata type has direct child objects (e.g. a TV Show should return Season Children). *Is only optional for Movie and Episode types.
| `episodeOrder` | string | No | Yes | When making a request that returns seasons in the response, pass back the appropriate season items for the requested [SeasonType id](Metadata.md#seasontype-array-optional). It is expected that if no seasons exist for the requested episodeOrder, that no season data should be returned. |
| `year` | integer | Yes | Yes | The release year for the requested match. |
| `guid` | string | Yes | Yes | An external id which can help matching precisely (e.g. `tvdb://12345) |
| `index` | integer | Yes | Yes* | For Seasons, the season number. For Episodes, the episode number. |
| `parentIndex` | integer | Yes | Yes* | For Episodes, the season number. |
| `filename` | string | No | Yes | The relative path for the underlying media file. For TV Shows and Seasons this will return the first file found. e.g. `/Movies/Back to the Future (1985).mp4` |
| `date` | string | Yes | Yes* | When matching an TV Episode, if `index` and `parentIndex` are not available, a date must be passed representing the air date of the episode.
| `manual` | integer (1/0) | Yes | Yes | When a value of `1` is passed, the response should contain an array of the best matches for the request ordered by highest to lowest confidence. When this value is not passed or is `0`, only the best match should be returned. |
| `includeAdult` | integer (1/0) | No | Yes | If your provider supports explicit/adult content this value should be taken into consideration when returning responses and any explicit results should be filtered out unless a value of `1` is passed. |

#### Match Example

##### JSON Body

```json
{
  "parentTitle": "Adventure Time",
  "type": 3,
  "index": 8,
  "filename": "TV Shows/Adventure Time/Adventure Time S08E01.mp4",
  "includeElements": "Metadata,Children",
  "includeFields": "guid,parentGuid,title,parentTitle,thumb,parentThumb,index,originallyAvailableAt,year,type",
  "includeChildren": 1
}
```

##### CURL Command

```
curl  -X POST \
  'http://localhost/library/metadata/matches?X-Plex-Country=US&X-Plex-Language=en-US' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "parentTitle": "Adventure Time",
  "type": 3,
  "index": 8,
  "filename": "TV Shows/Adventure Time/Adventure Time S08E01.mp4",
  "includeElements": "Metadata,Children",
  "includeFields": "guid,parentGuid,title,parentTitle,thumb,parentThumb,index,originallyAvailableAt,year,type",
  "includeChildren": 1
}'
```

##### Response

```json
{
  "MediaContainer": {
    "offset": 0,
    "totalSize": 1,
    "identifier": "tv.plex.provider.metadata",
    "size": 1,
    "Metadata": [
      {
        "guid": "plex://season/5d9c0939e9d5a1001f4def89",
        "type": "season",
        "thumb": "https://image.tmdb.org/t/p/original/zIDoU6YZXE3oz9MNBjE2Ld94Xuu.jpg",
        "title": "Season 8",
        "parentTitle": "Adventure Time",
        "parentThumb": "https://image.tmdb.org/t/p/original/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg",
        "parentGuid": "plex://show/5d9c07f72df347001e3a70b4",
        "index": 8,
        "originallyAvailableAt": "2016-03-26",
        "year": 2016,
        "Children": {
          "size": 2,
          "Metadata": [
            {
              "guid": "plex://episode/5eeb4fc1d39938003f7753c0",
              "type": "episode",
              "thumb": "https://image.tmdb.org/t/p/original/3WXclCno2MYKhdnUidQVsPSpolk.jpg",
              "title": "Broke His Crown",
              "parentTitle": "Season 8",
              "parentThumb": "https://image.tmdb.org/t/p/original/zIDoU6YZXE3oz9MNBjE2Ld94Xuu.jpg",
              "parentGuid": "plex://season/5d9c0939e9d5a1001f4def89",
              "index": 1,
              "originallyAvailableAt": "2016-03-26",
              "year": 2016
            },
            {
              "guid": "plex://episode/5eeb4fc1d39938003f7753be",
              "type": "episode",
              "thumb": "https://image.tmdb.org/t/p/original/mhhq4BXNmnZZfzfqsBvZwMvcngt.jpg",
              "title": "Don't Look",
              "parentTitle": "Season 8",
              "parentThumb": "https://image.tmdb.org/t/p/original/zIDoU6YZXE3oz9MNBjE2Ld94Xuu.jpg",
              "parentGuid": "plex://season/5d9c0939e9d5a1001f4def89",
              "index": 2,
              "originallyAvailableAt": "2016-04-02",
              "year": 2016
            }
          ]
        }
      }
    ]
  }
}
```