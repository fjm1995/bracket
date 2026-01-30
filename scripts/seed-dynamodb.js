#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

const REGION = process.env.AWS_REGION || 'us-east-2';
const TABLE_NAME = process.env.DYNAMO_TABLE || 'BracketTournaments';
const TOURNAMENTS_PER_GAME = parseInt(process.env.TOURNAMENTS_PER_GAME || '1', 10);
const MIN_PLAYERS = parseInt(process.env.MIN_PLAYERS || '6', 10);
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS || '100', 10);
const INCLUDE_LARGE = process.env.INCLUDE_LARGE === 'true';
const LARGE_PLAYER_COUNT = parseInt(process.env.LARGE_PLAYER_COUNT || '33', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const SEED_TAG = process.env.SEED_TAG || `seed-${new Date().toISOString().slice(0, 10)}`;
const GAMES_ARG = process.argv.find(arg => arg.startsWith('--games='));
const ALL_GAMES = process.argv.includes('--all-games');

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Cameron', 'Quinn',
  'Avery', 'Parker', 'Reese', 'Drew', 'Emerson', 'Hayden', 'Finley', 'Rowan'
];
const LAST_NAMES = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore',
  'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Lee'
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomName(existing) {
  let name = '';
  do {
    const first = FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)];
    const last = LAST_NAMES[randInt(0, LAST_NAMES.length - 1)];
    const num = randInt(1, 99);
    name = `${first} ${last} ${num}`;
  } while (existing.has(name));
  existing.add(name);
  return name;
}

function toAttr(value) {
  if (value === null || value === undefined) return { NULL: true };
  if (Array.isArray(value)) return { L: value.map(toAttr) };
  if (typeof value === 'string') return { S: value };
  if (typeof value === 'number') return { N: value.toString() };
  if (typeof value === 'boolean') return { BOOL: value };
  if (typeof value === 'object') {
    const map = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) continue;
      map[key] = toAttr(val);
    }
    return { M: map };
  }
  return { S: String(value) };
}

function loadGameRules() {
  const rulesPath = path.join(__dirname, '..', 'src', 'types', 'bracket.ts');
  const content = fs.readFileSync(rulesPath, 'utf8');
  const rulesBlockMatch = content.match(/export const GAME_RULES[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!rulesBlockMatch) {
    throw new Error('Unable to find GAME_RULES in bracket.ts');
  }
  const rulesBlock = rulesBlockMatch[1];
  const ruleRegex = /'([^']+)':\s*\{([\s\S]*?)\n\s*\},/g;
  const games = [];

  let match;
  while ((match = ruleRegex.exec(rulesBlock)) !== null) {
    const gameName = match[1];
    const block = match[2];
    const scoringModeMatch = block.match(/scoringMode:\s*'([^']+)'/);
    const scoreLabelMatch = block.match(/scoreLabel:\s*'([^']+)'/);
    const targetScoreMatch = block.match(/targetScore:\s*([0-9]+)/);

    games.push({
      game: gameName,
      scoringMode: scoringModeMatch ? scoringModeMatch[1] : 'higher_score',
      scoreLabel: scoreLabelMatch ? scoreLabelMatch[1] : 'Points',
      targetScore: targetScoreMatch ? parseInt(targetScoreMatch[1], 10) : undefined
    });
  }

  if (games.length === 0) {
    throw new Error('No games parsed from GAME_RULES');
  }
  return games;
}

function buildTournament(gameRule, index, playerCount) {
  const usedNames = new Set();
  const participants = Array.from({ length: playerCount }, () => ({
    id: uuidv4(),
    name: randomName(usedNames),
    gamePoints: 0
  }));

  const now = Date.now();
  return {
    id: uuidv4(),
    name: `${gameRule.game} Test ${index + 1} #${randInt(1000, 9999)}`,
    game: gameRule.game,
    scoringMode: gameRule.scoringMode,
    scoreLabel: gameRule.scoreLabel,
    targetScore: gameRule.targetScore,
    seedingMode: 'random',
    isStarted: false,
    participants,
    matches: [],
    currentRound: 1,
    totalRounds: 0,
    finalizedRounds: [],
    seedTag: SEED_TAG,
    createdAt: now,
    updatedAt: now
  };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function pickRandomGames(games, count) {
  const pool = [...games];
  const selected = [];
  const target = Math.min(count, pool.length);

  while (selected.length < target) {
    const idx = randInt(0, pool.length - 1);
    selected.push(pool.splice(idx, 1)[0]);
  }

  return selected;
}

async function askQuestion(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function chooseGames(gameRules) {
  if (ALL_GAMES) return gameRules;

  if (GAMES_ARG) {
    const value = GAMES_ARG.split('=')[1];
    if (value === 'all') return gameRules;
    const count = parseInt(value, 10);
    if (!Number.isNaN(count) && count > 0) {
      return pickRandomGames(gameRules, count);
    }
  }

  const answer = await askQuestion(`How many games do you want to seed? (1-${gameRules.length} or "all"): `);
  if (answer.toLowerCase() === 'all') {
    return gameRules;
  }

  const count = parseInt(answer, 10);
  if (!Number.isNaN(count) && count > 0) {
    return pickRandomGames(gameRules, count);
  }

  console.log('Invalid input, defaulting to all games.');
  return gameRules;
}

async function main() {
  const gameRules = loadGameRules();
  const selectedGames = await chooseGames(gameRules);
  const tournaments = [];

  selectedGames.forEach((rule) => {
    for (let i = 0; i < TOURNAMENTS_PER_GAME; i++) {
      const count = randInt(MIN_PLAYERS, MAX_PLAYERS);
      tournaments.push(buildTournament(rule, i, count));
    }
  });

  if (INCLUDE_LARGE) {
    const pick = selectedGames[randInt(0, selectedGames.length - 1)];
    tournaments.push(buildTournament(pick, TOURNAMENTS_PER_GAME, LARGE_PLAYER_COUNT));
  }

  const batches = chunkArray(tournaments, 25);

  console.log(`Seeding ${tournaments.length} tournaments into ${TABLE_NAME} (${REGION})`);
  console.log(`Games: ${selectedGames.length}, batches: ${batches.length}`);

  if (DRY_RUN) {
    console.log('Dry run enabled. No writes will be made.');
  }

  batches.forEach((batch, index) => {
    const requestItems = {
      [TABLE_NAME]: batch.map(t => ({
        PutRequest: { Item: toAttr(t).M }
      }))
    };

    const outPath = path.join(__dirname, `.seed-batch-${index + 1}.json`);
    fs.writeFileSync(outPath, JSON.stringify(requestItems, null, 2));

    if (!DRY_RUN) {
      const cmd = `aws dynamodb batch-write-item --region ${REGION} --request-items file://${outPath}`;
      execSync(cmd, { stdio: 'inherit' });
    }
  });

  console.log('Done.');
}

main();
