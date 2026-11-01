# Historical market odds

On 2026-11-01, all 91 games in 2026 Weeks 2–7 were backfilled with paired American moneylines and implied win percentages. Week 1's existing VegasInsider baseline was left unchanged.

## Sources and timing

Primary: [Probetrics NFL archive](https://www.probetrics.com/football/nfl/2026/week-2), using each week's board explicitly labeled **Closing**. The board reports seven to nine books per game. Its exact aggregation algorithm and individual quote timestamps are not exposed in the retrieved weekly boards; this is an archived market-board pair, not a newly computed multi-book consensus.

Cross-check: [The Odds Gap weekly archive](https://theoddsgap.com/weeklyslate/nfl/2026-week-2), using both sides from **FanDuel**, with the archive's closing-as-of label retained. All 91 games have a complete secondary pair. The maximum difference between primary and secondary no-vig probabilities is 2.07 percentage points (Week 5 NYG–WAS). Prices need not match exactly across books or snapshots.

Each game's `oddsMetadata` contains source URLs, retrieval date, source team orientation, reported book count, and the separate secondary quote. `sourceQuoteTimestamp: null` is intentional: scheduled kickoff is **not** a quote timestamp. The secondary archive sometimes labels a snapshot an hour or more before scheduled kickoff as closing. These records should be described as **source-reported archived closing odds**, not guaranteed final prices at the exact second the pool locked. Neither archive proves when an individual opponent submitted a pick.

The extracted primary rows, spreads/totals, and secondary checks are preserved in `data/odds/2026-weeks-02-07-closing.json` for auditability. Spreads/totals were not used to infer moneylines. The primary source describes its inputs at https://www.probetrics.com/about and https://www.probetrics.com/guide.

## Fields and calculation

Existing dashboard-compatible fields:

- `awayMoneyline`, `homeMoneyline`: paired American odds from the primary board.
- `awayNoVigWinPct`, `homeNoVigWinPct`: normalized implied probabilities as percentages.

Additional fields:

- `awayImpliedWinPct`, `homeImpliedWinPct`: raw implied percentages, including margin.
- `oddsMetadata`: provenance, timing limitations, and paired-book cross-check.

For American moneyline M:

- M < 0: raw probability = abs(M) / (abs(M) + 100).
- M > 0: raw probability = 100 / (M + 100).
- Fair away probability = raw away / (raw away + raw home); home is analogous.

Multiply by 100 and round to two decimal places only at the end. Do not mix the best away price from one book with the best home price from another. Do not infer odds from pool ownership or game results.

## Known orientation discrepancy

Week 3's Thursday game is `GB @ ATL` in the tracker; both archives list `ATL @ GB`. The team scores agree when matched by team. This backfill preserves all picks, game order, scores, results and existing home/away labels. Moneylines are assigned by **team identity**, and the game has `oddsMetadata.orientationWarning`. Home/away tendency analyses should exclude that game or use the source orientation until the underlying record is corrected. Do not assume the metadata warning means odds were reversed.

## Analytical use

These data permit market-favorite/underdog rates, selected-team probability, and team preference conditional on market strength. Treat very close markets as coin flips rather than strong evidence of contrarian behavior; near-even markets can have different favorites across books. Week 1 has different provenance and no exact lock-time guarantee, so retain that distinction in analyses.

The earlier Week 8 analysis bundle predates this backfill. Its simulation has not been refitted merely by adding these fields.

## Future collection

For future weeks, save paired pregame moneylines and UTC observation timestamps before each kickoff. Retain opening and pool-lock snapshots separately from closing snapshots, include bookmaker/provider and source URL, and preserve revisions rather than overwriting provenance. Never label a current or in-play quote as a historical closing quote. Missing values should stay missing if no verifiable pair exists.

Run `python3 scripts/validate_market_odds.py` to validate the backfilled fields and their source checks.
