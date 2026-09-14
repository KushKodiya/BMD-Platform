## Purpose

Defines the roles on the platform (owner, team-owning admin, public viewer) and what each
role is permitted to do, so that drafting privileges are limited to the 9 admins and setup
privileges to the single owner, while anyone may watch.

## ADDED Requirements

### Requirement: Role definitions

The system SHALL support exactly three roles: a single **owner**, up to **9 admins** (the
owner counts as one of the 9), and unlimited **viewers**. Each admin SHALL own exactly one
of the 9 teams, and each team SHALL be owned by exactly one admin.

#### Scenario: Owner is also an admin

- **WHEN** the owner account is set up
- **THEN** the owner SHALL also hold an admin role and own one of the 9 teams

#### Scenario: Admin count is capped at nine

- **WHEN** an attempt is made to grant admin/team-owner privileges to a 10th account
- **THEN** the system SHALL reject it, because all 9 teams already have owners

### Requirement: Owner privileges

The owner SHALL be the only role able to manage the player pool, arrange or randomize the
initial draft order, and start the draft.

#### Scenario: Non-owner cannot start the draft

- **WHEN** an admin who is not the owner attempts to start the draft or edit the player pool
- **THEN** the system SHALL deny the action

#### Scenario: Owner sets up the draft

- **WHEN** the owner enters players, sets the order, and starts the draft
- **THEN** the system SHALL accept each action

### Requirement: Admin drafting privileges

An admin SHALL be able to make a pick only for their own team and only when that team is on
the clock. Admins SHALL NOT pick on behalf of another team.

#### Scenario: Admin picks on their turn

- **WHEN** an admin's team is on the clock and they select an available player
- **THEN** the system SHALL record the pick for that admin's team

#### Scenario: Admin cannot pick for another team

- **WHEN** an admin attempts to submit a pick while a different team is on the clock
- **THEN** the system SHALL reject the pick

### Requirement: Viewer access

Viewers SHALL be able to view the draft board, all team rosters, and the remaining player
pool without authenticating. Viewers SHALL NOT be able to make picks or change any setup.

#### Scenario: Public viewing without login

- **WHEN** an unauthenticated visitor opens the draft board
- **THEN** the system SHALL display the board, rosters, and available players read-only

#### Scenario: Viewer cannot pick

- **WHEN** an unauthenticated visitor attempts to submit a pick
- **THEN** the system SHALL reject the action

### Requirement: Admin-managed contact details

Each admin SHALL be able to set and update their own notification email address on their own
account. An admin SHALL NOT edit another admin's contact details. (A phone number field for
future SMS is out of scope for this change.)

#### Scenario: Admin updates own contact info

- **WHEN** an admin edits their email address
- **THEN** the system SHALL save it for use in turn nudges to that admin

#### Scenario: Admin cannot edit another's contact info

- **WHEN** an admin attempts to change a different admin's email
- **THEN** the system SHALL deny the action

### Requirement: Admin-managed team name

Each admin SHALL be able to set and update the name of their own team. An admin SHALL NOT
rename another admin's team.

#### Scenario: Admin renames own team

- **WHEN** an admin submits a non-empty name for their own team
- **THEN** the system SHALL save it and the new name SHALL appear on the draft board

#### Scenario: Admin cannot rename another team

- **WHEN** an admin attempts to rename a team they do not own
- **THEN** the system SHALL deny the action

#### Scenario: Team name cannot be blank

- **WHEN** an admin submits an empty team name
- **THEN** the system SHALL reject it
