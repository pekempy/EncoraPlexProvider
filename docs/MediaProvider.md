# Plex Media Provider Object Documentation

## Overview

A Media Provider is a structured API that defines various endpoints for consumers to retrieve information about specific pieces of multimedia content.

This document describes the JSON response schema for Plex-compatible metadata-specific Media Providers.

## Response Structure

The root of the Media Provider must return some necessary attributes which define a metadata provider.

### MediaProvider

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identifier` | string | Yes | Unique identifier for this media provider |
| `title` | string | Yes | A human readable title for the media provider |
| `version` | string | No | The version of the API being called |
| `Feature` | array | Yes | Array containing the features provided by the media provider |

### `Types` Array (Required)

This defines what metadata types are supported by the provider.

Please note that is recommended to support one specific metadata parent type per provider as this will make it easier for consumers to combine this provider with others inside Plex Media Server. This is because in order to combine providers, each provider in a combine group must support the types the other supports as well. Limiting the scope of types will make it more widely compatible.

If you wish to support both movie and TV Shows, consider creating two separate providers. This isn't a hard requirement but is recommended.

When supporting TV Shows, it is necessary to add a type for TV Shows, Seasons and Episodes (i.e. types 2, 3 and 4).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | integer | Yes | The metadata type represented by its numeric value (see mapping table below) |
| `Scheme` | array | Yes | Array defining the GUID-scheme (the prefix) for items returned by this provider  |

### `Scheme` Array (Required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheme` | string | Yes | The GUID-scheme. Should be identical to the provider identifier. |

#### Metadata Types Table

| Type Name | Type Number |
|-----------|-------------|
| `movie` | 1 |
| `show` | 2 |
| `season` | 3 |
| `episode` | 4 |
| `collection` | 18 |

### `Feature` Array (Required)

A feature, as its name implies, defines a feature available to the specific provider.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Feature type (see feature table below) |
| `key` | string | Yes | API endpoint path to call this feature |

#### Available Features

| Type | Required | Description |
|------|----------|-------------|
| metadata | Yes | Path to retrieve metadata for a specific piece of content by its id. See Metadata Feature section. |
| match | Yes | Path to return a potential match for a specific piece of content using contextual hints. See Match Feature section. |
| collection | No | Path to retrieve metadata for a specific collection by its id. See Collection Feature section. |

### Example Response

```json
{
  "MediaProvider": {
    "identifier": "tv.plex.agents.johnz.tmdb",
    "title": "John Z's TV Show Provider",
    "version": "1.0.0",
    "Types": [
      {
        "type": 2,
        "Scheme": [
          {
            "scheme": "tv.plex.agents.johnz.tmdb"
          }
        ]
      },
      {
        "type": 3,
        "Scheme": [
          {
            "scheme": "tv.plex.agents.johnz.tmdb"
          }
        ]
      },
      {
        "type": 4,
        "Scheme": [
          {
            "scheme": "tv.plex.agents.johnz.tmdb"
          }
        ]
      }
    ],
    "Feature": [
      {
        "type": "metadata",
        "key": "/library/metadata"
      },
      {
        "type": "collection",
        "key": "/library/collections"
      },
      {
        "type": "match",
        "key": "/library/metadata/matches"
      }
    ]
  }
}
```

### Defining an identifier

Custom metadata providers need to provide a identifier using a scheme with the `tv.plex.agents.custom.` prefix. A custom provider can choose its own scheme as long as it is prefixed with this value, for example a provider for a custom TheMovieDB implementation might use a scheme like:

`tv.plex.agents.custom.johnz.tmdb`

It is important to note that you should try and keep the identifier unique as there is no guarantee that it will be the only provider added to a Plex user's server and could conflict with a another existing provider already in use. So avoid using very generic suffixes like `tmdb`, `tvdb`, etc.

The characters allowed for your suffix is very strict and can only contain ASCII letters, numbers and periods (`regex [a-zA-Z0-9.]`).

This identifier must be used as the scheme for the Metadata items the provider returns. See [GUID Construction](Metadata.md#guid-construction).