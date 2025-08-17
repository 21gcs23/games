// ===============================
// Math Battle Arena - MVP Engine
// ===============================

const screens = {
  start: document.getElementById('start-screen'),
  diff: document.getElementById('difficulty-screen'),
  how: document.getElementById('howto-screen'),
  battle: document.getElementById('battle-screen'),
  end: document.getElementById('end-screen')
};

const playerHPEl = document.getElementById('player-hp');
const enemyHPEl  = document.getElementById('enemy-hp');
const enemyNameEl= document.getElementById('enemy-name');
const problemEl  = document.getElementById('problem');
const answerEl   = document.getElementById('answer');
const choicesEl  = document.getElementById('choices');
const submitBtn  = document.getElementById('submit');
const timerFill  = document.getElementById('timer-fill');
const explainEl  = document.getElementById('explain');
const comboEl    = document.getElementById('combo');
const xpEl       = document.getElementById('xp');
const speedBonusEl = document.getElementById('speed-bonus');
const playerSprite = document.getElementById('player-sprite');
const enemySprite  = document.getElementById('enemy-sprite');
const effectsLayer = document.getElementById('effects-layer');

const endTitleEl = document.getElementById('end-title');
const statCorrectEl = document.getElementById('stat-correct');
const statTimeEl    = document.getElementById('stat-time');
const statXpEl      = document.getElementById('stat-xp');

let DIFF = 'beginner';
let GAME = null;

// ---- Routing helpers
function show(id){
  Object.values(screens).forEach(s=>s.classList.remove('active'));
  screens[id].classList.add('active');
}

// ---- Start screen buttons
document.getElementById('btn-start').addEventListener('click', () => {
  startGame();
});
document.getElementById('btn-difficulty').addEventListener('click', () => {
  show('diff');
});
document.getElementById('btn-howto').addEventListener('click', () => show('how'));
document.getElementById('btn-back-howto').addEventListener('click', () => show('start'));
document.getElementById('btn-back-from-diff').addEventListener('click', () => show('start'));

document.querySelectorAll('.btn.diff').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    DIFF = btn.dataset.diff;
    startGame();
  });
});

// End screen buttons
document.getElementById('btn-restart').addEventListener('click', ()=> startGame());
document.getElementById('btn-mainmenu').addEventListener('click', ()=> show('start'));

// ---- Game State
function createGame(){
  const enemyByDiff = {
    beginner: "Goblin Grunt",
    intermediate: "Orc Warrior",
    advanced: "Crimson Dragon"
  };
  return {
    startTime: performance.now(),
    timeTaken: 0,
    difficulty: DIFF,
    enemyName: enemyByDiff[DIFF] || "Goblin",
    playerMaxHP: 100,
    enemyMaxHP: 100,
    playerHP: 100,
    enemyHP: 100,
    combo: 0,
    xp: 0,
    correct: 0,
    question: null,
    answer: null,
    timerSec: 12,   // base time per question
    remaining: 12,
    running: false,
    shield: 0,      // absorbs next enemy damage if > 0
    doubleDmg: 0,   // next attack deals double if > 0
    healStacks: 0,  // small heal after correct if > 0
    lastQuestionTime: 0,
  }
}

// ---- Generators
function randInt(min, max){ // inclusive
  return Math.floor(Math.random()*(max-min+1))+min;
}

function genBeginner(){
  const num1 = randInt(1,10);
  const num2 = randInt(1,10);
  const op = Math.random()<0.5 ? '+' : '-';
  const q = `${num1} ${op} ${num2}`;
  const a = op==='+' ? num1+num2 : num1-num2;
  return {text: q, answer: a, tier:'easy'};
}

function genIntermediate(){
  const op = Math.random()<0.5 ? '*' : '/';
  if (op==='*'){
    const n1 = randInt(2,15), n2 = randInt(2,15);
    return {text:`${n1} * ${n2}`, answer: n1*n2, tier:'medium'};
  } else {
    // ensure integer division
    const n2 = randInt(2,15);
    const a  = randInt(2,12);
    const n1 = n2*a;
    return {text:`${n1} / ${n2}`, answer: a, tier:'medium'};
  }
}

function genAdvanced(){
  // Simple linear equations: ax + b = c
  const a = randInt(2,9);
  const x = randInt(1,12);
  const b = randInt(-10,10);
  const c = a*x + b;
  const signB = b>=0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  const text = `${a}x ${signB} = ${c}  (solve x)`;
  return {text, answer: x, tier:'hard'};
}

function nextQuestion(diff){
  if (diff==='beginner') return genBeginner();
  if (diff==='intermediate') return genIntermediate();
  return genAdvanced();
}

// ---- UI Updates
function setHP(el, val, max){
  const pct = Math.max(0, Math.min(1, val/max))*100;
  el.style.width = pct + '%';
}
function setTimer(pct){ timerFill.style.width = (pct*100)+'%'; }

function flashEffect(type='slash'){ // visual attack FX
  const fx = document.createElement('div');
  fx.style.position='absolute';
  fx.style.inset='0';
  fx.style.pointerEvents='none';
  fx.style.background = type==='slash'
    ? 'radial-gradient(circle at 70% 40%, rgba(255,255,255,0.25), transparent 40%), radial-gradient(circle at 30% 60%, rgba(255,215,0,0.25), transparent 40%)'
    : 'radial-gradient(circle at 50% 50%, rgba(255,80,80,0.25), transparent 40%)';
  fx.style.animation='fxfade .35s ease forwards';
  fx.innerHTML='';
  effectsLayer.appendChild(fx);
  setTimeout(()=>fx.remove(), 350);
}
const style = document.createElement('style');
style.textContent=`@keyframes fxfade{0%{opacity:1}100%{opacity:0}}`;
document.head.appendChild(style);

function setExplain(msg=''){
  explainEl.textContent = msg;
}

function setSpeedBonus(msg='—'){
  speedBonusEl.textContent = msg;
}

// ---- Damage model
function baseDamageFor(tier){
  if (tier==='easy') return 10;
  if (tier==='medium') return 18;
  return 28;
}
function enemyDamage(){ return randInt(10,16); }

// ---- Power-ups for fast answers
function applySpeedPowerups(game, ms){
  // under 2000ms: chance for double damage or shield
  if (ms <= 1500){
    game.doubleDmg = 1;
    setSpeedBonus('Double Damage!');
  } else if (ms <= 2500){
    game.shield = 1;
    setSpeedBonus('Shield Gained!');
  } else if (ms <= 3500){
    game.healStacks = 1;
    setSpeedBonus('Small Heal Ready!');
  } else {
    setSpeedBonus('—');
  }
}

// ---- Resolve Correct / Wrong
function playerAttack(game, tier){
  let dmg = baseDamageFor(tier);
  if (game.combo >= 3) dmg = Math.round(dmg * 1.25);
  if (game.doubleDmg > 0){ dmg *= 2; game.doubleDmg = 0; }
  game.enemyHP = Math.max(0, game.enemyHP - dmg);
  setHP(enemyHPEl, game.enemyHP, game.enemyMaxHP);
  enemySprite.classList.remove('idle'); enemySprite.classList.add('hit');
  playerSprite.classList.remove('idle'); playerSprite.classList.add('attack');
  flashEffect('slash');
  setTimeout(()=>{
    enemySprite.classList.remove('hit'); enemySprite.classList.add('idle');
    playerSprite.classList.remove('attack'); playerSprite.classList.add('idle');
  }, 300);
}

function enemyAttack(game){
  let dmg = enemyDamage();
  if (game.shield > 0){ dmg = 0; game.shield = 0; setSpeedBonus('Shield Block!'); }
  game.playerHP = Math.max(0, game.playerHP - dmg);
  setHP(playerHPEl, game.playerHP, game.playerMaxHP);
  playerSprite.classList.remove('idle'); playerSprite.classList.add('hit');
  flashEffect('blast');
  setTimeout(()=>{ playerSprite.classList.remove('hit'); playerSprite.classList.add('idle'); }, 250);
}

function maybeHeal(game){
  if (game.healStacks>0){
    const heal = 6;
    game.playerHP = Math.min(game.playerMaxHP, game.playerHP + heal);
    setHP(playerHPEl, game.playerHP, game.playerMaxHP);
    game.healStacks=0;
  }
}

// ---- Timer Loop
let timerHandle = null;

function startTimer(game){
  clearInterval(timerHandle);
  const total = game.timerSec*1000;
  game.lastQuestionTime = performance.now();
  game.remaining = game.timerSec;

  timerHandle = setInterval(()=>{
    if (!game.running) return;
    const elapsed = performance.now() - game.lastQuestionTime;
    const left = Math.max(0, total - elapsed);
    setTimer(left/total);
    if (left<=0){
      // Timeout -> enemy attacks
      setExplain('Time up! Enemy attacks.');
      game.combo = 0; comboEl.textContent = game.combo;
      enemyAttack(game);
      setSpeedBonus('—');
      nextTurn(game);
    }
  }, 100);
}

function stopTimer(){
  clearInterval(timerHandle);
}

// ---- Turn / Question
function setQuestion(game){
  const q = nextQuestion(game.difficulty);
  game.question = q.text;
  game.answer = q.answer;
  problemEl.textContent = q.text;
  answerEl.value = '';
  setExplain('');
  startTimer(game);
}

function nextTurn(game){
  if (game.playerHP<=0 || game.enemyHP<=0){
    return endGame(game);
  }
  setTimeout(()=> setQuestion(game), 450);
}

// ---- Submit Handling
function onSubmit(){
  if (!GAME?.running) return;
  const raw = (answerEl.value||'').trim();
  if (raw==='') return;

  // numeric compare (supports neg)
  const user = Number(raw);
  const correct = Number(GAME.answer);
  const elapsedMs = performance.now() - GAME.lastQuestionTime;

  stopTimer();

  if (Number.isFinite(user) && user === correct){
    GAME.correct += 1;
    GAME.combo += 1;
    GAME.xp += (GAME.difficulty==='advanced'?15: GAME.difficulty==='intermediate'?10:6);
    comboEl.textContent = GAME.combo;
    xpEl.textContent = GAME.xp;

    applySpeedPowerups(GAME, elapsedMs);
    playerAttack(GAME, tierFromQuestion(GAME.question));
    maybeHeal(GAME);
    setExplain('Correct! Nice hit!');
  } else {
    const exp = `Correct: ${GAME.answer}`;
    setExplain(exp);
    GAME.combo = 0; comboEl.textContent = GAME.combo;
    setSpeedBonus('—');
    enemyAttack(GAME);
  }

  nextTurn(GAME);
}

function tierFromQuestion(text){
  // quick mapping based on last generator used
  if (GAME.difficulty==='beginner') return 'easy';
  if (GAME.difficulty==='intermediate') return 'medium';
  return 'hard';
}

// ---- Game lifecycle
function startGame(){
  GAME = createGame();
  enemyNameEl.textContent = GAME.enemyName;
  setHP(playerHPEl, GAME.playerHP, GAME.playerMaxHP);
  setHP(enemyHPEl, GAME.enemyHP, GAME.enemyMaxHP);
  comboEl.textContent = '0';
  xpEl.textContent = '0';
  setTimer(1);
  setExplain('');
  setSpeedBonus('—');
  show('battle');
  GAME.running = true;
  setQuestion(GAME);
  answerEl.focus();
}

function endGame(game){
  game.running = false;
  stopTimer();
  const now = performance.now();
  game.timeTaken = Math.round((now - game.startTime)/1000);

  const victory = game.enemyHP<=0 && game.playerHP>0;
  endTitleEl.textContent = victory ? 'Victory!' : 'Defeat';
  statCorrectEl.textContent = String(game.correct);
  statTimeEl.textContent = `${game.timeTaken}s`;
  statXpEl.textContent = String(game.xp + (victory?20:0));

  show('end');
}

// ---- Input events
submitBtn.addEventListener('click', onSubmit);
answerEl.addEventListener('keydown', (e)=>{
  if (e.key==='Enter'){ onSubmit(); }
});

// ---- Accessibility: tap sprites to focus input on mobile
document.getElementById('battle-screen').addEventListener('click', ()=>{
  answerEl.focus();
});
