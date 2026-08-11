# Subsurface Feature Parity Roadmap

This document tracks the features needed to make Subsurface Web a capable,
modern alternative to Subsurface. The comparison baseline is the Subsurface
6.0 user manual (version 6.0.5556, updated July 17, 2026) and the current
Subsurface product overview.

The goal is not to reproduce every desktop feature. Priorities favor common
logbook workflows and features that fit a web application.

## Status Legend

- [x] Implemented
- [~] Partially implemented
- [ ] Not implemented

## Current Foundation

### Dive Log and Sites

- [x] Dive create, read, update, and delete workflows
- [x] Date, time, location, maximum depth, duration, buddy, rating, and notes
- [x] Water and surface conditions
- [x] GPS coordinates and dive-site management
- [x] Dive-site map with markers
- [x] Duplicate detection during imports and restores
- [x] Advanced filtering by text, date, depth, site, buddy, type, and rating
- [x] Metric, imperial, and customized unit preferences
- [x] 12-hour and 24-hour time display

### Profiles and Equipment

- [x] Depth/time profile charts with zoom and pan
- [x] Temperature and tank-pressure overlays
- [x] Tank size, working pressure, start/end pressure, and material
- [x] Air, Nitrox, and Trimix gas composition
- [x] Multiple tanks per dive
- [x] BCD, regulator, exposure suit, fins, mask, computer, weight, and notes
- [x] Basic SAC-rate calculation
- [~] Multiple weight systems: only a single combined weight is retained
- [~] Multiple dive-computer profiles: only the profile with the most samples is retained

### Import, Export, and Recovery

- [x] Basic UDDF import
- [x] Native Subsurface XML/SSRF import
- [x] Subsurface summary CSV and dive-computer profile CSV import
- [x] Standalone Subsurface dive-site XML import
- [x] Content-based import format detection and drag-and-drop import
- [x] Lossless application JSON backup and restore
- [x] Spreadsheet CSV export for all or filtered dives
- [~] Subsurface import fidelity is limited by the current dive and sample models

### Application Quality

- [x] Frontend and backend validation with field-level errors
- [x] API request rate limiting and request-size limits
- [x] Structured backend logging
- [x] Responsive design foundation
- [~] Offline operation queue: queued changes are not durable across a reload

## Priority 1: Logbook Organization

This is the next product focus. These features are foundational for filtering,
analytics, and higher-fidelity Subsurface imports.

### Tags, Trips, and Numbering

- [x] Add reusable tags to dives
- [x] Add trip records with name, location, dates, and notes
- [x] Assign and remove dives from trips
- [x] Group and collapse the dive list by trip
- [x] Merge and split trips
- [x] Store user-visible dive numbers independently from database IDs
- [x] Renumber all dives or a selected date range
- [x] Extend filters to include tags and trips
- [x] Preserve tags, trips, and dive numbers during import and backup/restore

### Bulk Logbook Operations

- [ ] Add multi-select to the dive list
- [ ] Bulk edit common dive fields
- [ ] Bulk assign tags and trips
- [ ] Shift the timestamps of selected dives
- [ ] Merge duplicate or multi-computer dive records
- [ ] Split a continuous profile into separate dives at surface intervals
- [ ] Undo and redo destructive or bulk logbook operations

## Priority 2: Complete the Dive Data Model

### Dive Identity and Environment

- [ ] Separate dive mode (`OC`, `freedive`, `CCR`, `pSCR`) from dive purpose
  (`recreational`, `training`, `technical`, `work`, `research`)
- [ ] Record divemaster and dive guide separately from buddies
- [ ] Record mean depth
- [ ] Calculate and display the surface interval before a dive
- [ ] Record altitude, surface pressure, and water density/salinity
- [ ] Support multiple named weight systems instead of one aggregate weight
- [ ] Retain dive-computer vendor, model, device ID, and dive-computer metadata
- [ ] Retain extra vendor-specific fields without discarding unknown data

### Profile Samples and Events

- [ ] Add a typed timeline-event model
- [ ] Import and display gas-change and cylinder-switch events
- [ ] Import and display alarms, warnings, bookmarks, and notifications
- [ ] Track the active gas and cylinder at each point in the profile
- [ ] Preserve readings from multiple pressure transmitters
- [ ] Preserve and switch between multiple dive-computer profiles
- [ ] Support manually editing profile waypoints
- [ ] Calculate ascent and descent rates as profile series
- [ ] Compare multiple dives or profiles on one chart

## Priority 3: Advanced Analytics

- [ ] Add a dedicated statistics route and dashboard
- [ ] Add date-range, tag, trip, site, buddy, dive-mode, and dive-type controls
- [ ] Show dive frequency by month, quarter, and year
- [ ] Show depth and duration distributions
- [ ] Show SAC-rate trends over time and by depth
- [ ] Show temperature-versus-depth and SAC-versus-depth scatterplots
- [ ] Show dive-site, gas, cylinder, suit, and equipment usage
- [ ] Support mean, minimum, maximum, median, sum, and count aggregations
- [ ] Support configurable grouping and histogram bins
- [ ] Allow selecting chart points or bars to inspect the underlying dives
- [ ] Add yearly summary statistics
- [ ] Make analytics honor the active dive-log filters

## Priority 4: Profile and Decompression Insight

These features require the richer profile-event and gas-use model above.
Calculated decompression information must be clearly identified as informational
and covered by verified test vectors.

- [ ] Show gas partial pressures for oxygen, nitrogen, and helium
- [ ] Show NDL and decompression-stop information reported by dive computers
- [ ] Show dive-computer and calculated decompression ceilings separately
- [ ] Calculate CNS exposure and oxygen toxicity units (OTU)
- [ ] Show tissue loading for the 16 Bühlmann compartments
- [ ] Show instantaneous and rolling gas-consumption rates
- [ ] Detect rapid ascents and safety-stop compliance
- [ ] Calculate repetitive-dive surface intervals
- [ ] Add configurable gradient factors and decompression display preferences

## Priority 5: Media

- [ ] Attach photographs and videos to dives
- [ ] Read capture timestamps from image metadata
- [ ] Shift camera timestamps to match dive-computer time
- [ ] Place media markers on the dive profile
- [ ] Add a per-dive media gallery
- [ ] Support local uploads and externally hosted media
- [ ] Preserve attachment metadata in backups

## Priority 6: Accounts, Sync, and Offline Use

- [ ] Add authentication and remove the fixed development user
- [ ] Isolate dives, sites, settings, and backups by account
- [ ] Persist dive data locally for offline viewing
- [ ] Persist queued changes across reloads and browser restarts
- [ ] Synchronize automatically after reconnecting
- [ ] Detect and resolve edit conflicts across devices
- [ ] Add installable PWA support
- [ ] Provide explicit sync status and recovery controls

## Later Parity Work

### Direct Dive-Computer Import

- [ ] Evaluate a libdivecomputer service or native companion architecture
- [ ] Support USB and serial downloads where the browser/platform permits
- [ ] Support Bluetooth/BLE downloads where the browser/platform permits
- [ ] Remember frequently used devices
- [ ] Import only new dives and allow a forced full download
- [ ] Preview and select downloaded dives before saving
- [ ] Capture diagnostic logs for failed downloads

### Dive Planning

- [ ] Create an interactive depth, time, and gas plan editor
- [ ] Implement Bühlmann ZH-L16 with configurable gradient factors
- [ ] Evaluate VPM-B support
- [ ] Plan open-circuit, CCR, and pSCR dives
- [ ] Support multiple gases, switches, bailout gases, and gas-volume estimates
- [ ] Support repetitive-dive planning
- [ ] Save planned dives to the logbook
- [ ] Print or export dive plans with prominent safety disclaimers

### Export and Printing

- [ ] Generate printable and PDF logbooks with dive profiles
- [ ] Add yearly-statistics printing
- [ ] Export dive sites as KML
- [ ] Export native Subsurface XML
- [ ] Export profile-panel calculated data
- [ ] Add configurable print templates
- [ ] Export UDDF for interchange with other dive-log applications

UDDF export is intentionally deprioritized until logbook organization, analytics,
and profile events are further developed.

### Localization and Accessibility

- [ ] Add application localization and localized units/date formatting
- [ ] Improve keyboard navigation and shortcuts
- [ ] Audit semantics, labels, focus management, and color contrast
- [ ] Add reduced-motion and high-contrast support
- [ ] Complete the small-screen and touch experience
- [x] Add light, dark, and system themes with a persisted device preference

## Product Ideas Outside Strict Subsurface Parity

These may still be valuable, but they should not be counted as missing
Subsurface parity unless the upstream product adds an equivalent capability.

- [ ] Equipment maintenance schedules and reminders
- [ ] Certification progress tracking
- [ ] Emergency contacts and incident reporting
- [ ] Marine-life species logging
- [ ] Tide and historical weather integration
- [ ] Community dive-site reviews
- [ ] Dive-shop and buddy social networks
- [ ] Collaborative group dive planning

## Next Sprint

1. Add multi-select to the dive list.
2. Add bulk editing for common dive fields.
3. Add bulk tag and trip assignment.
4. Add timestamp shifting for selected dives.
5. Design undo for destructive bulk operations.

## Reference

- [Subsurface product overview](https://subsurface-divelog.org/)
- [Subsurface 6.0 user manual](https://subsurface-divelog.org/subsurface-user-manual/)
