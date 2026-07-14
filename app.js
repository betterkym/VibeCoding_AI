const balls = [...document.querySelectorAll('.lotto-ball')];
const drawButton = document.querySelector('#drawButton');
const resetButton = document.querySelector('#resetButton');
const gameCount = document.querySelector('#gameCount');
const resultsSection = document.querySelector('#resultsSection');
const resultsList = document.querySelector('#resultsList');
const copyButton = document.querySelector('#copyButton');
const toast = document.querySelector('#toast');
const ballStage = document.querySelector('#ballStage');
const bottomPlay = document.querySelector('#bottomPlay');
const historyList = document.querySelector('#historyList');
const historyStatus = document.querySelector('#historyStatus');
const refreshHistory = document.querySelector('#refreshHistory');

let currentNumbers = [];
let lockedNumbers = new Set();
let savedGames = [];

const colorFor = n => n <= 10 ? 'yellow' : n <= 20 ? 'blue' : n <= 30 ? 'red' : n <= 40 ? 'gray' : 'green';

function pickNumbers(count, excluded = []) {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !excluded.includes(n));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function renderMain(numbers, animate = false) {
  balls.forEach((ball, index) => {
    const n = numbers[index];
    ball.className = 'lotto-ball';
    if (!n) { ball.classList.add('empty'); ball.textContent = ''; return; }
    ball.textContent = n;
    ball.classList.add(colorFor(n));
    if (lockedNumbers.has(n)) ball.classList.add('locked');
    if (animate && !lockedNumbers.has(n)) {
      ball.style.animationDelay = `${index * 85}ms`;
      ball.classList.add('rolling');
    }
  });
}

function renderResults() {
  resultsList.innerHTML = savedGames.map((game, index) => `
    <div class="result-row" style="--row-delay:${index * 110}ms">
      <span class="result-label">GAME ${String(index + 1).padStart(2, '0')}</span>
      <div class="mini-balls">${game.map(n => `<span class="mini-ball ${colorFor(n)}">${n}</span>`).join('')}</div>
    </div>`).join('');
  resultsSection.hidden = false;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

async function loadHistory() {
  try {
    const response = await fetch('/api/draws');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '저장 기록을 불러오지 못했습니다.');
    const draws = payload;
    historyStatus.textContent = draws.length ? `최근 ${draws.length}회 추첨` : '아직 저장된 추첨 기록이 없습니다.';
    historyList.innerHTML = draws.map(draw => {
      const date = new Date(draw.createdAt).toLocaleString('ko-KR');
      return `<div class="history-draw">
        <div class="history-meta"><b>#${draw.id}</b><span>${date}</span></div>
        ${draw.games.map((game, index) => `<div class="result-row"><span class="result-label">GAME ${String(index + 1).padStart(2, '0')}</span><div class="mini-balls">${game.map(n => `<span class="mini-ball ${colorFor(n)}">${n}</span>`).join('')}</div></div>`).join('')}
      </div>`;
    }).join('');
  } catch (error) {
    historyStatus.textContent = error.message;
  }
}

async function saveDraw() {
  const response = await fetch('/api/draws', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ games: savedGames, lockedNumbers: [...lockedNumbers] })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || '추첨 결과를 저장하지 못했습니다.');
  await loadHistory();
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function celebrate() {
  const colors = ['#e96a50', '#e7ae32', '#4386a3', '#599674', '#17212b'];
  const burst = document.createElement('div');
  burst.className = 'confetti-burst';
  burst.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 34; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${Math.random() * 100}vw`);
    piece.style.setProperty('--delay', `${Math.random() * 220}ms`);
    piece.style.setProperty('--fall', `${1.3 + Math.random() * 1.1}s`);
    piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    piece.style.background = colors[i % colors.length];
    burst.append(piece);
  }
  document.body.append(burst);
  setTimeout(() => burst.remove(), 2600);
}

async function revealNumbers(finalNumbers) {
  const revealed = finalNumbers.map(n => lockedNumbers.has(n) ? n : null);
  renderMain(revealed);
  for (let i = 0; i < finalNumbers.length; i++) {
    if (lockedNumbers.has(finalNumbers[i])) continue;
    revealed[i] = finalNumbers[i];
    renderMain(revealed);
    balls[i].style.animationDelay = '0ms';
    balls[i].classList.add('rolling');
    await wait(230);
  }
}

async function draw() {
  drawButton.disabled = true;
  drawButton.innerHTML = '<span>●</span> 섞는 중...';
  const locked = [...lockedNumbers];
  const needed = 6 - locked.length;
  savedGames = [];
  resultsSection.hidden = true;
  ballStage.classList.add('mixing');

  for (let spin = 0; spin < 12; spin++) {
    currentNumbers = [...locked, ...pickNumbers(needed, locked)].sort((a,b) => a-b);
    renderMain(currentNumbers);
    await wait(48 + spin * 7);
  }

  currentNumbers = [...locked, ...pickNumbers(needed, locked)].sort((a,b) => a-b);
  savedGames.push(currentNumbers);
  for (let i = 1; i < Number(gameCount.value); i++) {
    savedGames.push([...locked, ...pickNumbers(needed, locked)].sort((a,b) => a-b));
  }
  ballStage.classList.remove('mixing');
  await revealNumbers(currentNumbers);
  renderResults();
  celebrate();
  try {
    await saveDraw();
    showToast('추첨 결과를 DB에 저장했어요');
  } catch (error) {
    showToast(`저장 실패: ${error.message}`);
  }
  drawButton.disabled = false;
  drawButton.innerHTML = '<span>▶</span> 다시 섞기';
}

balls.forEach(ball => ball.addEventListener('click', () => {
  const n = currentNumbers[Number(ball.dataset.index)];
  if (!n) return;
  lockedNumbers.has(n) ? lockedNumbers.delete(n) : lockedNumbers.add(n);
  renderMain(currentNumbers);
}));

resetButton.addEventListener('click', () => {
  currentNumbers = []; lockedNumbers.clear(); savedGames = [];
  renderMain([]); resultsSection.hidden = true;
  ballStage.classList.remove('mixing');
  drawButton.innerHTML = '<span>▶</span> 번호 섞기';
});

drawButton.addEventListener('click', draw);
bottomPlay.addEventListener('click', () => {
  document.querySelector('#draw').scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (!drawButton.disabled) draw();
});
copyButton.addEventListener('click', async () => {
  const text = savedGames.map((game, i) => `${i + 1}게임: ${game.join(', ')}`).join('\n');
  try { await navigator.clipboard.writeText(text); }
  catch { const area = document.createElement('textarea'); area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); }
  showToast('번호를 복사했어요');
});
refreshHistory.addEventListener('click', loadHistory);
loadHistory();
