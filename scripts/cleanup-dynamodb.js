#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REGION = process.env.AWS_REGION || 'us-east-2';
const TABLE_NAME = process.env.DYNAMO_TABLE || 'BracketTournaments';
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');
const SEEDED = process.argv.includes('--seeded');

const NAME_ARG = process.argv.find(arg => arg.startsWith('--name-contains='));
const TAG_ARG = process.argv.find(arg => arg.startsWith('--seed-tag='));

const NAME_CONTAINS = NAME_ARG ? NAME_ARG.split('=')[1] : null;
const SEED_TAG = TAG_ARG ? TAG_ARG.split('=')[1] : null;

if (!NAME_CONTAINS && !SEED_TAG && !SEEDED) {
  console.error('Error: provide --name-contains, --seed-tag, or --seeded');
  process.exit(1);
}

if (!CONFIRM) {
  console.error('Error: add --confirm to perform deletions.');
  process.exit(1);
}

function runAws(cmd) {
  return execSync(cmd, { encoding: 'utf8' });
}

function buildScanArgs(startKey) {
  const names = [];
  const values = [];
  let filter = '';

  if (NAME_CONTAINS) {
    names.push('"#name":"name"');
    values.push('":name":{"S":"' + NAME_CONTAINS + '"}');
    filter = 'contains(#name, :name)';
  }

  if (SEED_TAG) {
    names.push('"#seedTag":"seedTag"');
    values.push('":tag":{"S":"' + SEED_TAG + '"}');
    filter = filter
      ? filter + ' AND #seedTag = :tag'
      : '#seedTag = :tag';
  }

  const exprNames = names.length ? `--expression-attribute-names '{${names.join(',')}}'` : '';
  const exprValues = values.length ? `--expression-attribute-values '{${values.join(',')}}'` : '';
  const startKeyArg = startKey ? `--exclusive-start-key '${JSON.stringify(startKey)}'` : '';

  return [
    `aws dynamodb scan --region ${REGION}`,
    `--table-name ${TABLE_NAME}`,
    `--projection-expression "id"`,
    `--filter-expression "${filter}"`,
    exprNames,
    exprValues,
    startKeyArg,
    '--output json'
  ].filter(Boolean).join(' ');
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function loadSeededIds() {
  const scriptsDir = __dirname;
  const files = fs.readdirSync(scriptsDir)
    .filter(name => name.startsWith('.seed-batch-') && name.endsWith('.json'));

  const ids = [];

  files.forEach((file) => {
    const filePath = path.join(scriptsDir, file);
    const contents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(contents);
    const tableItems = data[TABLE_NAME] || data[Object.keys(data)[0]] || [];

    tableItems.forEach((entry) => {
      const item = entry && entry.PutRequest && entry.PutRequest.Item;
      const id = item && item.id && item.id.S;
      if (id) ids.push(id);
    });
  });

  return Array.from(new Set(ids));
}

function main() {
  let lastKey = null;
  const ids = [];

  if (SEEDED) {
    ids.push(...loadSeededIds());
  } else {
    do {
      const cmd = buildScanArgs(lastKey);
      const output = runAws(cmd);
      const data = JSON.parse(output);
      (data.Items || []).forEach(item => {
        if (item.id && item.id.S) {
          ids.push(item.id.S);
        }
      });
      lastKey = data.LastEvaluatedKey || null;
    } while (lastKey);
  }

  console.log(`Found ${ids.length} items to delete from ${TABLE_NAME} (${REGION}).`);

  if (DRY_RUN) {
    console.log('Dry run enabled. No deletes will be made.');
    return;
  }

  const batches = chunk(ids, 25);
  batches.forEach((batch, index) => {
    const requestItems = {
      [TABLE_NAME]: batch.map(id => ({
        DeleteRequest: { Key: { id: { S: id } } }
      }))
    };

    const payload = JSON.stringify(requestItems);
    const cmd = `aws dynamodb batch-write-item --region ${REGION} --request-items '${payload}'`;
    console.log(`Deleting batch ${index + 1}/${batches.length} (${batch.length} items)`);
    execSync(cmd, { stdio: 'inherit' });
  });
}

main();
