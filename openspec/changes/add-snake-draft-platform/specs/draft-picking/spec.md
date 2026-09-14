## Purpose

Defines the snake-order turn engine and the draft board: who is on the clock, what makes a
pick valid, how the clock advances, when the draft ends, and what viewers see.

## ADDED Requirements

### Requirement: Snake order progression

Picks SHALL follow snake order over the initial draft order: odd-numbered rounds proceed in
the draft order (team 1 to team 9) and even-numbered rounds proceed in reverse (team 9 to
team 1). Exactly one team SHALL be on the clock at any time while the draft is in progress.

#### Scenario: First round follows draft order

- **WHEN** the draft starts
- **THEN** the first team in the draft order SHALL be on the clock, followed by the rest in
  order for round 1

#### Scenario: Even round reverses

- **WHEN** round 1 completes with all 9 teams having picked
- **THEN** round 2 SHALL begin with the last team of the draft order and proceed in reverse

#### Scenario: Odd round after even resumes forward

- **WHEN** round 2 completes
- **THEN** round 3 SHALL begin with the first team of the draft order again

### Requirement: Making a valid pick

A pick SHALL be accepted only when submitted by the admin of the team currently on the clock
and only for a player still available in the pool. On a valid pick, the player SHALL be
assigned to that team, removed from the available pool, and the clock SHALL advance to the
next team in snake order.

#### Scenario: Valid pick advances the clock

- **WHEN** the on-clock admin picks an available player
- **THEN** the system SHALL assign the player to their team, remove the player from the
  pool, and put the next team on the clock

#### Scenario: Cannot pick an already-drafted player

- **WHEN** the on-clock admin attempts to pick a player who has already been drafted
- **THEN** the system SHALL reject the pick and the clock SHALL not advance

#### Scenario: Out-of-turn pick rejected

- **WHEN** an admin whose team is not on the clock submits a pick
- **THEN** the system SHALL reject it

### Requirement: Picks are final

Once recorded, a pick SHALL be permanent. The system SHALL NOT provide undo, skip, or
auto-pick.

#### Scenario: No undo available

- **WHEN** any user attempts to reverse or change a recorded pick
- **THEN** the system SHALL not allow it

### Requirement: Draft ends when the pool is empty

The draft SHALL run until the player pool is empty rather than for a fixed number of rounds.
The number of rounds SHALL be derived as the ceiling of (player count / 9). The final round
MAY be uneven, so some teams end with one more player than others. When the last available
player is picked, the draft SHALL be marked complete and no team SHALL be on the clock.

#### Scenario: Draft completes on last pick

- **WHEN** the on-clock admin picks the last remaining player in the pool
- **THEN** the system SHALL mark the draft complete and show no team on the clock

#### Scenario: Uneven final round

- **WHEN** the player count is not an exact multiple of 9
- **THEN** the teams earlier in the final round's order SHALL receive one more player than
  the teams whose slots fall after the pool empties

### Requirement: Draft board and rosters

The system SHALL present a draft board as a grid of rounds by teams showing each pick, each
team's roster, and the list of still-available players. The board SHALL reflect the current
on-clock team and update as picks are recorded.

#### Scenario: Board shows picks and current turn

- **WHEN** a viewer or admin opens the board during the draft
- **THEN** the system SHALL show all picks made so far, each team's roster, the remaining
  available players, and which team is on the clock

#### Scenario: Board reflects a new pick

- **WHEN** a pick is recorded and the board is next loaded or refreshed
- **THEN** the new pick SHALL appear in the grid and roster and the player SHALL no longer
  appear in the available list
