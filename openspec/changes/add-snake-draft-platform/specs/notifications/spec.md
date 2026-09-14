## Purpose

Defines the single stale-turn nudge: if the admin on the clock has not picked within 4 hours
of their turn starting, they receive one email reminder, with no repeats and no effect on the
draft's progression.

## ADDED Requirements

### Requirement: Four-hour stale-turn nudge

When a team has been on the clock for more than 4 hours without a pick, the system SHALL send
the on-clock admin exactly one email nudge, using the email address that admin has set on
their own account. The nudge SHALL be sent at most once per turn.

#### Scenario: Nudge after four idle hours

- **WHEN** a team has been on the clock for more than 4 hours and has not picked
- **THEN** the system SHALL send one email to that team's admin

#### Scenario: No nudge before four hours

- **WHEN** a team has been on the clock for less than 4 hours
- **THEN** the system SHALL NOT send a nudge

#### Scenario: No repeat nudge

- **WHEN** a nudge has already been sent for the current turn and the admin still has not
  picked
- **THEN** the system SHALL NOT send another nudge for that same turn

#### Scenario: A prompt pick sends no nudge

- **WHEN** the admin picks within 4 hours of their turn starting
- **THEN** the system SHALL send no nudge for that turn

### Requirement: Nudge does not alter draft progression

The nudge SHALL be a reminder only. It SHALL NOT skip the turn, auto-pick, or otherwise
advance the clock. The draft SHALL remain blocked on the on-clock admin until they pick.

#### Scenario: Draft stays blocked after nudge

- **WHEN** a nudge has been sent and the admin still has not picked
- **THEN** the same team SHALL remain on the clock until that admin makes a pick

### Requirement: Missing email address

If the on-clock admin has not set an email address, the system SHALL skip the nudge without
error and SHALL NOT block the draft due to the missing address.

#### Scenario: No email on file

- **WHEN** a stale turn is detected and the admin has no email address set
- **THEN** the system SHALL skip the nudge without error and the draft SHALL remain blocked
  on that admin until they pick
