# Changelog

## [1.4.0] - 2026-04-23

### Added

- Auto breifing feature added for entities

### Improved

- Improved Archives UI Operations Map

### Fixed

- Fixed Entity Comperison component
- Fixed where application fails to load children of Entity Sections that linked to another Entity Section

## [1.3.0] - 2026-04-07

### Added

- Added Darkmode support for Wiki UI
- Added Recent Events and Updated Entites display into operations map component
- Added map-data endpoint for operations map component to pull data at once. 

### Improved

- Improved overall Wiki UI
- Improved UX of Custom map Editor and viewer

## [1.2.0] - 2026-04-05

### Added

- Added Temporal Slider for Entity Incidents to observe Events in an order.
- Added Event Reconstruction for Entity Incidents to observe Event in a different Angle.
- Added Event Reconstruction API Endpoint
- Added Timeline Reconstruction API Endpoint
- Added "part-of" relation definition and "phase", "Event Type", "Year", "Time", "Threat Level" EntityMeta attribute to default seeders.
- Added "narrative", "phase" and "duration" to "timeline_events" table
- Added "timeline_event_id" to "entity_intelligence_records" table
- Added Map Data endpoint for pull more enhanced Archives UI data for universe.
- Added "CTRL + K" keyboard listener to open search terminal in Archives UI

### Removed

- Removed map_entities_taype_and_has_map_relation_type migration that causing issues hwen seeding.

### Fixed

- Fixed wiki changelog api data fetch failure

### Updated

- Updated design of Archives' universe sidebar.
- Improved display of wiki changelog

## [1.1.0] - 2026-04-02

### Updated

- Matched Search Connection Results graph UI with Entity Connection Graph UI

## [1.0.0] - 2026-04-01

### Added

- Initial Release