## Purpose

Covers everything the owner does before picking begins: building the player pool, defining
the 9 teams, setting the initial draft order, and starting the draft (which locks the pool
and order in place).

## ADDED Requirements

### Requirement: Player pool management

The owner SHALL be able to add, edit, and remove players in the pool before the draft
starts. Each player SHALL have a required name and an optional year in school and optional
major.

#### Scenario: Add a player with only a name

- **WHEN** the owner adds a player with a name and leaves year and major blank
- **THEN** the system SHALL add the player to the pool

#### Scenario: Add a player with full details

- **WHEN** the owner adds a player with name, year in school, and major
- **THEN** the system SHALL store all provided fields

#### Scenario: Name is required

- **WHEN** the owner attempts to add a player without a name
- **THEN** the system SHALL reject the entry

#### Scenario: Edit the pool before start

- **WHEN** the draft has not yet started and the owner edits or removes a player
- **THEN** the system SHALL apply the change

### Requirement: Team definitions

The system SHALL maintain exactly 9 teams, each owned by one admin. Each team SHALL have a
display name.

#### Scenario: Nine teams exist

- **WHEN** the draft is set up
- **THEN** the system SHALL present exactly 9 named teams, each mapped to one admin

### Requirement: Initial draft order

The owner SHALL be able to set the initial order of the 9 teams manually, and SHALL be able
to randomize the order with a single action. The order SHALL be a complete ordering of all 9
teams with no duplicates or omissions.

#### Scenario: Owner sets order manually

- **WHEN** the owner arranges the 9 teams into a specific sequence
- **THEN** the system SHALL save that sequence as the draft order

#### Scenario: Owner randomizes order

- **WHEN** the owner clicks "randomize order"
- **THEN** the system SHALL produce a random complete ordering of all 9 teams and save it

### Requirement: Starting the draft locks setup

Starting the draft SHALL require a non-empty player pool and a complete draft order. Once
started, the player pool and the initial draft order SHALL be locked and no longer editable.

#### Scenario: Cannot start with an empty pool

- **WHEN** the owner attempts to start the draft with no players in the pool
- **THEN** the system SHALL refuse to start and explain that players are required

#### Scenario: Pool locked after start

- **WHEN** the draft has started and the owner attempts to add, edit, or remove a player
- **THEN** the system SHALL reject the change

#### Scenario: Order locked after start

- **WHEN** the draft has started and the owner attempts to change the draft order
- **THEN** the system SHALL reject the change
