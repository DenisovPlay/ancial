import https from 'https';

export function httpsGetJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      rejectUnauthorized: false,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Ancial-NextJS-Server',
      },
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${(e as Error).message}. Response: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}
