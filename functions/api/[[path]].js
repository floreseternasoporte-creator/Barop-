import apiHandler from '../../api/index.js';

const toObjectHeaders = (headers) => {
  const out = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
};

const buildQuery = (url, pathParts) => {
  const query = Object.fromEntries(url.searchParams.entries());
  query.path = pathParts;
  query.fn = pathParts;
  return query;
};

const createResponseAdapter = () => {
  const state = {
    statusCode: 200,
    headers: new Headers(),
    body: ''
  };

  return {
    setHeader: (key, value) => state.headers.set(key, value),
    status: (code) => {
      state.statusCode = code;
      return {
        send: (body) => {
          state.body = body ?? '';
        },
        json: (value) => {
          state.headers.set('Content-Type', 'application/json; charset=utf-8');
          state.body = JSON.stringify(value);
        }
      };
    },
    send: (body) => {
      state.body = body ?? '';
    },
    json: (value) => {
      state.headers.set('Content-Type', 'application/json; charset=utf-8');
      state.body = JSON.stringify(value);
    },
    toResponse: () => new Response(state.body, { status: state.statusCode, headers: state.headers })
  };
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  let body;
  const contentType = context.request.headers.get('content-type') || '';
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    if (contentType.includes('application/json')) {
      body = await context.request.json();
    } else {
      body = await context.request.text();
    }
  }

  const req = {
    method: context.request.method,
    headers: toObjectHeaders(context.request.headers),
    query: buildQuery(url, pathParts),
    body
  };

  const res = createResponseAdapter();
  await apiHandler(req, res);
  return res.toResponse();
}
