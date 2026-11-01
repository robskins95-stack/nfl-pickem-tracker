"""Validate the 2026 Weeks 2–7 historical odds backfill; standard library only."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def implied(ml):
    assert isinstance(ml, (int, float)) and abs(ml) >= 100, ml
    return abs(ml) / (abs(ml) + 100) if ml < 0 else 100 / (ml + 100)


def main():
    audit = json.loads((ROOT / 'data/odds/2026-weeks-02-07-closing.json').read_text())
    counts = []
    for week in range(2, 8):
        w = json.loads((ROOT / f'data/2026/week-{week:02}.json').read_text())
        assert len({frozenset((g['away'], g['home'])) for g in w['games']}) == len(w['games'])
        for g in w['games']:
            a, h = implied(g['awayMoneyline']), implied(g['homeMoneyline'])
            for side, raw in [('away', a), ('home', h)]:
                assert g[f'{side}ImpliedWinPct'] == round(100 * raw, 2)
                assert g[f'{side}NoVigWinPct'] == round(100 * raw / (a + h), 2)
            assert abs(g['awayNoVigWinPct'] + g['homeNoVigWinPct'] - 100) < .011
            meta = g['oddsMetadata']
            assert meta['lineType'] == 'archived_closing'
            assert meta['sourceQuoteTimestamp'] is None
            assert meta['sourceUrl'].endswith(f'week-{week}')
            c = meta['crossCheck']
            ca, ch = implied(c['awayMoneyline']), implied(c['homeMoneyline'])
            assert c['awayNoVigWinPct'] == round(100 * ca / (ca + ch), 2)
            assert c['bookmaker'] == 'FanDuel' and c['sourceClosingAsOfLabel']
            assert abs(c['awayProbabilityDifferencePp']) <= 3
            teams = {'JAX' if t == 'JAC' else t for t in [g['away'], g['home']]}
            row = [r for r in audit['records'] if r['week'] == week and {r['away'], r['home']} == teams]
            assert len(row) == 1
            for side in ['away', 'home']:
                team = 'JAX' if g[side] == 'JAC' else g[side]
                srcside = 'away' if row[0]['away'] == team else 'home'
                assert g[side + 'Moneyline'] == row[0][srcside + 'Moneyline']
        for player in w['players']:
            assert len(player['picks']) == len(w['games'])
            assert sum(p is not None and p == g['winner'] for p, g in zip(player['picks'], w['games'])) == player['points']
        counts.append(len(w['games']))
    assert counts == [16, 16, 16, 15, 14, 14]
    assert len(audit['records']) == sum(counts) == 91
    print('PASS: 91 games; primary and secondary pairs; raw/no-vig calculations; audit matching; player scores.')


if __name__ == '__main__':
    main()
