const $ = (selector) => document.querySelector(selector);
const name = new URLSearchParams(location.search).get('name');

async function getWeek(number) {
  try {
    const response = await fetch(`data/2026/week-${String(number).padStart(2, '0')}.json`);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

const pct = (number) => `${Math.round(number)}%`;
const winnerNames = (week) => week.weeklyWinners?.length
  ? week.weeklyWinners
  : (week.weeklyWinner ? [week.weeklyWinner] : []);
const matchPlayer = (player, playerName) => player.name.toLowerCase() === playerName.toLowerCase()
  || player.name.split(' ')[0].toLowerCase() === playerName.toLowerCase();
const formatWeeklyWins = (value) => Number.isInteger(value)
  ? String(value)
  : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

function preFinalScore(week, player) {
  let score = 0;
  for (let index = 0; index < week.games.length - 1; index++) {
    if (week.games[index].winner && player.picks[index] === week.games[index].winner) score++;
  }
  return score;
}

function finalGameContext(week, player) {
  if (!week.games?.length || !player?.picks?.length) return null;
  const index = week.games.length - 1;
  const game = week.games[index];
  const pick = player.picks[index];
  if (!pick) return null;
  const playerPre = preFinalScore(week, player);
  const others = (week.players || []).filter((candidate) => candidate !== player).map((candidate) => preFinalScore(week, candidate));
  const bestOther = others.length ? Math.max(...others) : playerPre;
  const diff = playerPre - bestOther;
  const away = pick === game.away;
  const probability = away ? game.awayNoVigWinPct : game.homeNoVigWinPct;
  const ownership = away ? game.awayPoolPct : game.homePoolPct;
  return { diff, pick, probability, ownership, isDog: Number.isFinite(probability) ? probability < 50 : null, game, playerPre, bestOther };
}

async function load() {
  if (!name) throw Error('No player selected');
  $('#name').textContent = name;
  document.title = `${name} — NextWeekGPT`;
  const [week1, week2, registry] = await Promise.all([
    getWeek(1),
    getWeek(2),
    fetch('data/players.json').then((response) => response.json()).catch(() => ({ players: [] })),
  ]);
  const weeks = [week1, week2].filter(Boolean);
  const finals = weeks.filter((week) => week.status === 'final');
  let picks = 0;
  let marketPicks = 0;
  let wins = 0;
  let dogs = 0;
  let dogWins = 0;
  let probability = 0;
  let ownership = 0;
  let pts = 0;
  let weeklyWins = 0;
  const history = [];
  const situations = [];

  finals.forEach((week) => {
    const player = (week.players || []).find((candidate) => matchPlayer(candidate, name));
    if (!player) return;
    pts += player.points || 0;
    const winners = winnerNames(week);
    if (winners.includes(player.name)) weeklyWins += 1 / winners.length;

    const detail = player.picks.map((pick, index) => {
      const game = week.games[index];
      const away = pick === game.away;
      const pickProbability = away ? game.awayNoVigWinPct : game.homeNoVigWinPct;
      const pickOwnership = away ? game.awayPoolPct : game.homePoolPct;
      const win = pick === game.winner;
      picks++;
      wins += win ? 1 : 0;
      if (Number.isFinite(pickProbability)) {
        marketPicks++;
        if (pickProbability < 50) {
          dogs++;
          dogWins += win ? 1 : 0;
        }
        probability += pickProbability;
      }
      ownership += pickOwnership || 0;
      return { pick, game, probability: pickProbability, ownership: pickOwnership, win };
    });
    const finalContext = finalGameContext(week, player);
    if (finalContext) situations.push({ week: week.week, ...finalContext });
    history.push({ week, player, detail, finalContext });
  });

  $('#summary').innerHTML = [
    ['Points', pts],
    ['Accuracy', picks ? pct(wins / picks * 100) : '—'],
    ['Underdog rate', marketPicks ? pct(dogs / marketPicks * 100) : '—'],
    ['Dog record', `${dogWins}-${dogs - dogWins}`],
    ['Avg implied', marketPicks ? pct(probability / marketPicks) : '—'],
    ['Avg ownership', picks ? pct(ownership / picks) : '—'],
    ['Weekly wins', formatWeeklyWins(weeklyWins)],
    ['Picks tracked', picks],
  ].map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value small-value">${value}</div></div>`).join('');

  const buckets = [
    { label: 'Trailing by 1', test: (situation) => situation.diff === -1 },
    { label: 'Tied for lead', test: (situation) => situation.diff === 0 },
    { label: 'Leading by 1', test: (situation) => situation.diff === 1 },
  ];
  $('#mnf').innerHTML = `<div class="cards">${buckets.map((bucket) => {
    const matches = situations.filter(bucket.test);
    const marketMatches = matches.filter((situation) => Number.isFinite(situation.probability));
    const dogPicks = marketMatches.filter((situation) => situation.isDog);
    const avgPick = marketMatches.length ? marketMatches.reduce((sum, situation) => sum + situation.probability, 0) / marketMatches.length : null;
    const avgDog = dogPicks.length ? dogPicks.reduce((sum, situation) => sum + situation.probability, 0) / dogPicks.length : null;
    return `<div class="card"><div class="label">${bucket.label}</div><div class="value small-value">${marketMatches.length ? `${dogPicks.length}/${marketMatches.length} dogs` : (matches.length ? 'market TBD' : '—')}</div><div class="muted">Dog rate: ${marketMatches.length ? pct(dogPicks.length / marketMatches.length * 100) : '—'}<br>Avg pick market: ${avgPick == null ? '—' : `${avgPick.toFixed(1)}%`}<br>Avg dog strength: ${avgDog == null ? '—' : `${avgDog.toFixed(1)}%`}</div></div>`;
  }).join('')}</div>${situations.length ? '<div class="note profile-note">Final-game leverage is derived from standings before the last game on the weekly slate. A 45% pick is treated as a modest underdog; a 30% pick as a much larger underdog.</div>' : '<p class="muted">No finalized final-game situations yet.</p>'}`;

  const registered = registry.players.find((player) => matchPlayer(player, name));
  $('#notes').innerHTML = registered?.notes?.length
    ? registered.notes.map((note) => `<div class="note profile-note">${note}</div>`).join('')
    : '<p class="muted">No manually confirmed tendencies yet. Let the data cook.</p>';

  $('#history').innerHTML = history.length ? history.map((item) => {
    const context = item.finalContext;
    const position = context
      ? (context.diff === -1 ? '1 back' : context.diff === 0 ? 'tied for lead' : context.diff === 1 ? '1 ahead' : context.diff > 1 ? `${context.diff} ahead` : `${Math.abs(context.diff)} back`)
      : '—';
    const contextMarket = context && Number.isFinite(context.probability)
      ? `${context.probability.toFixed(1)}% market probability${context.isDog ? ' (underdog)' : ''}`
      : 'market odds TBD';
    return `<section class="history-week"><h3><a href="week.html?season=2026&week=${item.week.week}">Week ${item.week.week}</a> — ${item.player.points} points • Final total ${item.player.tiebreaker ?? '—'}</h3>${context ? `<p class="muted">Entering final game: ${position} • Picked ${context.pick} • ${contextMarket}</p>` : ''}<div class="pick-chips">${item.detail.map((pick) => {
      const market = Number.isFinite(pick.probability) ? `${pick.probability.toFixed(0)}%` : '—';
      return `<span class="chip ${pick.win ? 'correct' : 'wrong'}" title="${pick.game.away} @ ${pick.game.home}; market ${market}; pool ${pick.ownership}%">${pick.pick} <small>${market} / ${pick.ownership}%</small></span>`;
    }).join('')}</div></section>`;
  }).join('') : '<p class="muted">No finalized picks stored for this player yet.</p>';
}

load().catch((error) => {
  document.querySelector('main').innerHTML = `<section class="panel"><h2>${error.message}</h2><p><a href="index.html">Return to season</a></p></section>`;
});
