import { Client } from '@opensearch-project/opensearch';

const client = new Client({
  node: 'https://tenacious-myrtilloca-1pvc97en.us-east-1.bonsaisearch.net',
  auth: {
    username: '979df1ab38',
    password: '498df3dcd4bde6e83573'
  }
});

client.info().then(info => console.log(info.body)).catch(err => console.error(err.message, err.meta?.body));
