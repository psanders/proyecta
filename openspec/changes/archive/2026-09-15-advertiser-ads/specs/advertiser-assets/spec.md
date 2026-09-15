## Purpose

Lets an advertiser keep a library of the videos and images its ads play (Recursos), checking every file
automatically on upload so that only files a player can show, for a billable length, ever reach an ad.

## ADDED Requirements

### Requirement: Upload a file

Admins and owners SHALL upload a file to their business's library with a name (1–80 characters; the file name when
omitted). Accepted formats SHALL be MP4, WebM and MOV videos up to 200 MB and JPG, PNG and WebP images up to 20 MB.
An image upload SHALL carry a display duration of 5, 10 or 15 seconds. Members SHALL NOT upload.

#### Scenario: Upload a video

- **WHEN** an admin uploads a 15-second 1920×1080 MP4 named "Promo Verano"
- **THEN** the library lists "Promo Verano" as a video of 15 s, 1920×1080, landscape, while it's being prepared

#### Scenario: Image without a duration

- **WHEN** an admin uploads a PNG without choosing 5, 10 or 15 seconds
- **THEN** the upload fails with a validation error on the duration and nothing is stored

#### Scenario: Unsupported format

- **WHEN** an admin uploads a GIF or a PDF
- **THEN** the upload fails with a Spanish error naming the accepted formats and nothing is stored

#### Scenario: Member uploads

- **WHEN** a member (not admin or owner) uploads a file
- **THEN** the request fails as forbidden

### Requirement: Automated checks

Every upload SHALL be inspected before it is accepted. A file whose content can't be read as a video or image SHALL be
rejected. A video SHALL last between 5 and 60 seconds and within half a second of a whole multiple of 5 seconds; its
duration SHALL be recorded as that multiple. The shorter side of a video or image SHALL be at least 480 pixels. The
orientation SHALL be recorded as landscape when the width is at least the height, portrait otherwise. Each rejection
SHALL return a specific Spanish (or English) message.

#### Scenario: Video of an odd length

- **WHEN** an admin uploads a video that lasts 17 seconds
- **THEN** the upload fails saying videos must last 5, 10, 15… seconds, up to 60

#### Scenario: Slightly long encode

- **WHEN** an admin uploads a video that lasts 15.03 seconds
- **THEN** it is accepted with a duration of 15 seconds

#### Scenario: Too small

- **WHEN** an admin uploads a 640×360 image
- **THEN** the upload fails saying the file must be at least 480 px on its shorter side

#### Scenario: Renamed file that isn't media

- **WHEN** an admin uploads a text file renamed to `promo.mp4`
- **THEN** the upload fails saying the file couldn't be read as a video or image

### Requirement: Player renditions

After an upload is accepted, the platform SHALL prepare player renditions in the background — WebP for images, VP9
WebM and H.264 MP4 for videos, without audio and capped at 1080p on the long side — and SHALL show the asset as
preparing ("Procesando"), ready ("Listo") or failed ("Error"). Only ready assets SHALL be usable in ads.

#### Scenario: Preparation finishes

- **WHEN** an uploaded video's renditions finish
- **THEN** the asset shows as ready with a preview and can be chosen for an ad

#### Scenario: Preparation fails

- **WHEN** preparing an uploaded file's renditions fails
- **THEN** the asset shows as failed and is not offered when creating an ad

### Requirement: Library

Every member SHALL see their business's assets, newest first, with name, type, duration, dimensions, orientation,
status and a preview when ready. Assets SHALL be immutable: a file's content, duration and dimensions never change
after upload. Admins and owners SHALL delete an asset only when no ad has ever used it (ads keep their history,
including cancelled ones).

#### Scenario: Browse the library

- **WHEN** a member opens Recursos
- **THEN** they see every asset of their business, newest first, and none from other businesses

#### Scenario: Delete an asset in use

- **WHEN** an admin deletes an asset that an ad uses or used
- **THEN** the request fails saying the file is used by an ad, and the asset remains

#### Scenario: Delete an unused asset

- **WHEN** an admin deletes an asset no ad has used
- **THEN** it disappears from the library
