const $ = (selector) => document.querySelector(selector);
const pct = (number) => `${Math.round(number)}%`;
const slug = (name) => encodeURIComponent(name);
const winnerNames = (week) => week.weeklyWinners?.length
  ? week.weeklyWinners
  : (week.weeklyWinner ? [week.weeklyWinner] : []);

const leaderboardColumns = [
  { key: 'name', label: 'Player', type: 'text' },
  { key: 'pts', label: 'Pts', type: 'number' },
  { key: 'accuracy', label: 'Accuracy', type: 'number' },
  { key: 'underdogRate', label: 'Dog rate', type: 'number' },
  { key: 'avgProb', label: 'Avg market', type: 'number' },
  { key: 'avgOwn', label: 'Avg ownership', type: 'number' },
  { key: 'weeklyWins', label: 'Weekly wins', type: 'number' },
];

let leaderboardStats = [];
let leaderboardSort = { key: 'pts', direction: 'desc' };

async function getWeek(number) {
  try {
    const response = await fetch(`data/2026/week-${String(number).padStart(2, '0')}.json`);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function gameForPick(week, index, pick) {
  const game = week.games[index];
  if (!game) return null;
  const away = pick === game.away;
  return {
    game,
    win: game.winner ? pick === game.winner : null,
    probability: away ? game.awayNoVigWinPct : game.homeNoVigWinPct,
    ownership: away ? game.awayPoolPct : game.homePoolPct,
  };
}

function formatWeeklyWins(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function sortedLeaderboardStats() {
  const column = leaderboardColumns.find(({ key }) => key === leaderboardSort.key);
  const multiplier = leaderboardSort.direction === 'asc' ? 1 : -1;
  return [...leaderboardStats].sort((a, b) => {
    const comparison = column.type === 'text'
      ? a[column.key].localeCompare(b[column.key])
      : a[column.key] - b[column.key];
    return comparison ? comparison * multiplier : a.name.localeCompare(b.name);
  });
}

function renderLeaderboard() {
  const table = $('#leaderboard');
  const headers = leaderboardColumns.map((column) => {
    const active = column.key === leaderboardSort.key;
    const indicator = active ? (leaderboardSort.direction === 'asc' ? ' ▲' : ' ▼') : '';
    const ariaSort = active
      ? ` aria-sort="${leaderboardSort.direction === 'asc' ? 'ascending' : 'descending'}"`
      : '';
    return `<th class="sortable" data-sort="${column.key}" tabindex="0" role="button"${ariaSort} title="Sort by ${column.label}">${column.label}<span class="sort-indicator">${indicator}</span></th>`;
  }).join('');

  table.innerHTML = `<thead><tr>${headers}</tr></thead><tbody>${sortedLeaderboardStats().map((stat) => `<tr>
    <td><a href="player.html?name=${slug(stat.name)}">${stat.name}</a></td>
    <td>${stat.pts}</td>
    <td>${pct(stat.accuracy)}</td>
    <td>${pct(stat.underdogRate)}</td>
    <td>${pct(stat.avgProb)}</td>
    <td>${pct(stat.avgOwn)}</td>
    <td>${formatWeeklyWins(stat.weeklyWins)}</td>
  </tr>`).join('')}</tbody>`;

  const changeSort = (key) => {
    if (leaderboardSort.key === key) {
      leaderboardSort.direction = leaderboardSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      leaderboardSort = {
        key,
        direction: key === 'name' ? 'asc' : 'desc',
      };
    }
    renderLeaderboard();
  };

  table.querySelectorAll('th[data-sort]').forEach((header) => {
    header.addEventListener('click', () => changeSort(header.dataset.sort));
    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        changeSort(header.dataset.sort);
      }
    });
  });
}

async function load() {
  const [week1, week2] = await Promise.all([getWeek(1), getWeek(2)]);
  const weeks = [week1, week2].filter(Boolean);
  const finals = weeks.filter((week) => week.status === 'final');
  const names = [...new Set(finals.flatMap((week) => (week.players || []).map((player) => player.name)))];

  leaderboardStats = names.map((name) => {
    let picks = 0;
    let marketPicks = 0;
    let wins = 0;
    let dogs = 0;
    let dogWins = 0;
    let probability = 0;
    let ownership = 0;
    let pts = 0;
    let weeklyWins = 0;

    finals.forEach((week) => {
      const player = week.players.find((candidate) => candidate.name === name);
      if (!player) return;
      pts += player.points || 0;

      const winners = winnerNames(week);
      if (winners.includes(name)) weeklyWins += 1 / winners.length;

      player.picks.forEach((pick, index) => {
        const result = gameForPick(week, index, pick);
        if (!result) return;
        picks++;
        if (result.win) wins++;
        if (Number.isFinite(result.probability)) {
          marketPicks++;
          if (result.probability < 50) {
            dogs++;
            if (result.win) dogWins++;
          }
          probability += result.probability;
        }
        ownership += result.ownership || 0;
      });
    });

    return {
      name,
      picks,
      wins,
      pts,
      weeklyWins,
      accuracy: picks ? wins / picks * 100 : 0,
      underdogRate: marketPicks ? dogs / marketPicks * 100 : 0,
      dogWins,
      avgProb: marketPicks ? probability / marketPicks : 0,
      avgOwn: picks ? ownership / picks : 0,
    };
  });

  $('#summary').innerHTML = [
    ['Season', '2026'],
    ['Weeks stored', weeks.length],
    ['Final weeks', finals.length],
    ['Players', names.length],
  ].map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join('');

  $('#weeks').innerHTML = weeks.map((week) => {
    const winners = winnerNames(week);
    return `<a class="week-card" href="week.html?season=2026&week=${week.week}">
      <span class="eyebrow">${week.status === 'final' ? 'FINAL' : 'CURRENT'}</span>
      <b>Week ${week.week}</b>
      <small>${week.status === 'final' ? `${winners.length > 1 ? 'Winners' : 'Winner'}: ${winners.length ? winners.join(' & ') : 'TBD'}` : 'Pre-lock board'}</small>
    </a>`;
  }).join('');

  renderLeaderboard();

  $('#players').innerHTML = leaderboardStats
    .slice()
    .sort((a, b) => b.pts - a.pts || b.accuracy - a.accuracy)
    .map((stat) => `<a class="player" href="player.html?name=${slug(stat.name)}">
      <h3>${stat.name}</h3>
      <div class="stats">
        <div class="stat"><b>${pct(stat.accuracy)}</b><span>Accuracy</span></div>
        <div class="stat"><b>${pct(stat.underdogRate)}</b><span>Underdog rate</span></div>
        <div class="stat"><b>${pct(stat.avgProb)}</b><span>Avg implied %</span></div>
        <div class="stat"><b>${pct(stat.avgOwn)}</b><span>Avg pool ownership</span></div>
      </div>
    </a>`).join('');
}

load().catch((error) => document.body.insertAdjacentHTML('beforeend', `<p class="error">Data load error: ${error.message}</p>`));
