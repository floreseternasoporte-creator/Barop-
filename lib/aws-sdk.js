let cachedSdk = null;

class MissingAwsClient {
  constructor(serviceName) {
    this.serviceName = serviceName;
  }

  _reject(operationName) {
    const error = new Error(
      `AWS SDK is not available in this runtime. Missing dependency while executing ${this.serviceName}.${operationName}. ` +
      'Install "aws-sdk" as a production dependency or bundle an AWS SDK v3 client.'
    );
    error.code = 'AWS_SDK_MISSING';

    return {
      promise: async () => {
        throw error;
      }
    };
  }

  getObject() {
    return this._reject('getObject');
  }

  putObject() {
    return this._reject('putObject');
  }

  headBucket() {
    return this._reject('headBucket');
  }

  sendEmail() {
    return this._reject('sendEmail');
  }

  deleteObject() {
    return this._reject('deleteObject');
  }

  listObjectsV2() {
    return this._reject('listObjectsV2');
  }
}

const createFallback = () => ({
  S3: class extends MissingAwsClient {
    constructor() {
      super('S3');
    }
  },
  SES: class extends MissingAwsClient {
    constructor() {
      super('SES');
    }
  }
});

try {
  // eslint-disable-next-line global-require
  cachedSdk = require('aws-sdk');
} catch (error) {
  cachedSdk = createFallback();
}

module.exports = cachedSdk;
