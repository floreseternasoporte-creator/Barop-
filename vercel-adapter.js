const toEventBody = (body) => {
  if (body === undefined || body === null) return body;
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  return JSON.stringify(body);
};

const runVercelHandler = async (handler, req, res) => {
  const event = {
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query,
    body: toEventBody(req.body)
  };

  const result = await handler(event);

  if (result?.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    });
  }

  res.status(result?.statusCode || 200).send(result?.body || '');
};

module.exports = { runVercelHandler };
