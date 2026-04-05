# Changelog

## [1.2.0] - /

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