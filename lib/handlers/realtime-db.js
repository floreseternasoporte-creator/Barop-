const AWS = require('../aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-2'
});

const BUCKET = process.env.AWS_S3_BUCKET;
const STATE_KEY = 'realtime-db/state.json';

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  },
  body: JSON.stringify(body)
});

const parsePath = (path = '') => String(path).split('/').filter(Boolean);

function getAtPath(root, path) {
  const parts = parsePath(path);
  let node = root;
  for (const key of parts) {
    if (node == null || typeof node !== 'object' || !(key in node)) return null;
    node = node[key];
  }
  return node;
}

function setAtPath(root, path, value) {
  const parts = parsePath(path);
  if (parts.length === 0) return value;
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!node[key] || typeof node[key] !== 'object') node[key] = {};
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
  return root;
}

function removeAtPath(root, path) {
  const parts = parsePath(path);
  if (parts.length === 0) return {};
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!node[key] || typeof node[key] !== 'object') return root;
    node = node[key];
  }
  delete node[parts[parts.length - 1]];
  return root;
}

function mergeDeep(target, patch) {
  const out = { ...(target && typeof target === 'object' ? target : {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !('__op' in v)) {
      out[k] = mergeDeep(out[k], v);
    } else {
      out[k] = applyTransform(out[k], v);
    }
  }
  return out;
}

function applyTransform(current, incoming) {
  if (incoming && typeof incoming === 'object' && incoming.__op === 'increment') {
    const base = Number(current || 0);
    return base + Number(incoming.by || 0);
  }
  if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
    const out = {};
    for (const [k, v] of Object.entries(incoming)) out[k] = applyTransform(current ? current[k] : undefined, v);
    return out;
  }
  return incoming;
}

async function readState() {
  try {
    const obj = await s3.getObject({ Bucket: BUCKET, Key: STATE_KEY }).promise();
    return JSON.parse(obj.Body.toString());
  } catch (error) {
    if (error.code === 'NoSuchKey') return {};
    throw error;
  }
}

async function writeState(state) {
  await s3.putObject({
    Bucket: BUCKET,
    Key: STATE_KEY,
    Body: JSON.stringify(state || {}),
    ContentType: 'application/json'
  }).promise();
}

function applyQuery(value, query = {}) {
  if (!query.orderByChild) return value;
  if (!value || typeof value !== 'object') return value;

  let entries = Object.entries(value);
  if (query.equalTo !== undefined) {
    const equalTo = query.equalTo;
    entries = entries.filter(([, item]) => {
      const childVal = item && typeof item === 'object' ? item[query.orderByChild] : undefined;
      return String(childVal) === String(equalTo);
    });
  }
  return Object.fromEntries(entries);
}

exports.handler = async (event) => {
  try {
    if (!BUCKET) {
      return response(500, { error: 'Missing S3 bucket for realtime-db bridge.' });
    }

    if (event.httpMethod === 'OPTIONS') return response(200, { ok: true });

    const query = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const path = query.path || body.path || '';

    const state = await readState();

    if (event.httpMethod === 'GET') {
      const current = getAtPath(state, path);
      const filtered = applyQuery(current, {
        orderByChild: query.orderByChild,
        equalTo: query.equalTo
      });
      return response(200, { data: filtered });
    }

    if (event.httpMethod === 'PUT') {
      const nextValue = applyTransform(getAtPath(state, path), body.value);
      const nextState = setAtPath(state, path, nextValue);
      await writeState(nextState);
      return response(200, { success: true, data: nextValue });
    }

    if (event.httpMethod === 'PATCH') {
      const current = getAtPath(state, path);
      const nextValue = mergeDeep(current, body.value || {});
      const nextState = setAtPath(state, path, nextValue);
      await writeState(nextState);
      return response(200, { success: true, data: nextValue });
    }

    if (event.httpMethod === 'DELETE') {
      const nextState = removeAtPath(state, path);
      await writeState(nextState);
      return response(200, { success: true });
    }

    if (event.httpMethod === 'POST') {
      const action = body.action || 'push';
      if (action === 'push') {
        const current = getAtPath(state, path);
        const parent = current && typeof current === 'object' ? { ...current } : {};
        const key = `k_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        parent[key] = applyTransform(undefined, body.value);
        const nextState = setAtPath(state, path, parent);
        await writeState(nextState);
        return response(200, { success: true, key, data: parent[key] });
      }

      if (action === 'transaction') {
        const nextState = setAtPath(state, path, applyTransform(getAtPath(state, path), body.value));
        await writeState(nextState);
        return response(200, { success: true, data: getAtPath(nextState, path) });
      }

      return response(400, { error: 'Unsupported action.' });
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Realtime DB bridge error:', error);
    return response(500, { error: error.message });
  }
};
