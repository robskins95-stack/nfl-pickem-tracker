# NFL Pick'em Tracker

A long-term NFL straight-up pick'em pool tracker designed to get more useful every week and every season.

## What this project tracks

- NFL games by season and week
- Home/away teams, final scores, and winners
- Moneylines for each team
- Vig-adjusted implied win probabilities
- Every pool player's pick for every game
- Weekly tiebreaker guesses and weekly winners
- Historical player profiles and tendencies

## Player profile ideas

Each player's profile can eventually show:

- Overall pick accuracy
- Chalk rate
- Underdog pick rate
- Average implied probability of selected teams
- Performance in close / coin-flip games
- Underdog hit rate
- Biggest successful upset pick
- Team-specific tendencies
- Pick similarity vs. other players
- Performance relative to market expectation
- Weekly and season history

## Data design principle

Raw historical data should remain separate from derived analytics. That way, new metrics can be added later without losing the original picks, odds, or results.

## Roadmap

1. Build a static dashboard suitable for GitHub Pages
2. Define JSON data structures for seasons, games, players, picks, and weekly results
3. Backfill 2026 Week 1
4. Add Week 2 and continue updating weekly
5. Build player profile pages and pool-wide analytics
6. Add strategic views for leverage, pick similarity, and likely opponent behavior

## Hosting

This project is intended to run as a static site on GitHub Pages.
