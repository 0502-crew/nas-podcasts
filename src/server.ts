import * as express from 'express';
import * as BodyParser from 'body-parser';
import * as cors from 'cors';
import { RssFeed } from './rss/RssFeed';
import { FilesUtil } from './util/FilesUtil';

const app = express();
const port = 9001;
const ipAddress = getIPAddress();
const podcastsRootFolder = '\\\\192.168.1.2\\Backup\\Podcasts';
const rssBaseUrl = 'http://' + ipAddress + ':' + port + '/podcast-rss';
const podcastFileBaseUrl = 'http://' + ipAddress + ':' + port + '/podcasts';

app.use(cors());
app.use(express.json());
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

// Serve the podcast audio files
app.use('/podcasts/', express.static(podcastsRootFolder));

app.get('/', async (req,res) => {
  const podcasts = await FilesUtil.listPodcasts(podcastsRootFolder, rssBaseUrl);
  res.json(podcasts);
});

app.get('/podcast-rss/:name', async (req,res) => {
  const podcastName = req.params.name;
  const rssXml = await new RssFeed(podcastsRootFolder, podcastName, podcastFileBaseUrl).generateRssXml();
  res.type('application/xml');
  res.send(rssXml);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function getIPAddress () {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.1')) {
            return net.address;
          }
      }
  }
}