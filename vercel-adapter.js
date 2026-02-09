const runVercelHandler = async (handler, req, res) => {
  const event = {
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query,
    body: req.body ? JSON.stringify(req.body) : req.body
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
