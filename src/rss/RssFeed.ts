import * as fs from 'fs';
import path = require('path');
// https://www.npmjs.com/package/node-id3
const NodeID3Promise = require('node-id3').Promise;
// https://www.npmjs.com/package/get-mp3-duration
const getMP3Duration = require('get-mp3-duration');
import objectHash = require('object-hash');

export class RssFeed {
  private imageName = 'image.jpg';
  private rssName = 'rss.xml';
  private usefilename = 'usefilename.txt';
  private thisPodcastFileBaseUrl: string;
  private usefilenameForPubDate = false;

  public constructor(private rootFolder: string, private podcastName: string, private podcastFileBaseUrl:string) {
    this.thisPodcastFileBaseUrl = this.podcastFileBaseUrl + '/' + this.podcastName + '/';
  }
  
  public async generateRssXml(): Promise<string> {
    const podcastFolder = path.join(this.rootFolder, this.podcastName);
    
    const usefilenameFile = path.join(podcastFolder, this.usefilename);
    this.usefilenameForPubDate = fs.existsSync(usefilenameFile);

    const rssXmlPath = path.join(podcastFolder, this.rssName);
    if(fs.existsSync(rssXmlPath)) {
      return (await fs.promises.readFile(rssXmlPath)).toString();
    }
    
    var rssXml: string = await this.generateRssTop();
    const podcastFilesPath = await fs.promises.readdir(podcastFolder);
    for (const file of podcastFilesPath) {
      const filePath = path.join(podcastFolder, file);
      if (await this.isAudioFile(filePath)) {
        rssXml += await this.generateRssItem(filePath);
      }
      // Now move async
      // await fs.promises.rename(fromPath, toPath);
    }

    rssXml += (await fs.promises.readFile(path.join(__dirname, '../../rssTemplates/rssBottom.xml'))).toString();

    await fs.promises.writeFile(rssXmlPath, rssXml);
    return rssXml;
  }

  private async generateRssTop(): Promise<string> {
    var rssTopXml: string = (await fs.promises.readFile(path.join(__dirname, '../../rssTemplates/rssTop.xml'))).toString();
    const title = this.podcastName;
    const description = '';
    const pubDate = new Date().toUTCString();
    const summary = '';
    const author = '';
    const imageUrl = this.thisPodcastFileBaseUrl + this.imageName;
    rssTopXml = rssTopXml
      .replace('{{title}}', title)
      .replace('{{description}}', description)
      .replace('{{pubDate}}', pubDate)
      .replace('{{summary}}', summary)
      .replace('{{author}}', author)
      .replace('{{imageUrl}}', imageUrl);
    
    return rssTopXml;
  }

  private async generateRssItem(filePath: string): Promise<string> {
    var rssItemXml: string = (await fs.promises.readFile(path.join(__dirname, '../../rssTemplates/rssItem.xml'))).toString();
    const tags = await NodeID3Promise.read(filePath);
    const mp3File = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    const stat = await fs.promises.stat(filePath);
    const imagePath = path.join(path.dirname(filePath), this.imageName);
    if(!fs.existsSync(imagePath) && tags.image && tags.image.imageBuffer) {
      fs.writeFileSync(imagePath, tags.image.imageBuffer);
    }


    const guid = objectHash(tags);
    const title = tags.title;
    const htmlDescription = tags.subtitle;
    var pubDate: Date;
    if(this.usefilenameForPubDate) {
      const dateString = '20' + fileName.slice(0,2) + '-' + fileName.slice(2,4) + '-' + fileName.slice(4,6);
      console.log(dateString);
      pubDate = new Date(Date.parse(dateString));
    } else {
      pubDate = stat.mtime;
    }
    const author = tags.artist;
    const audioLengthBytes = stat.size + '';
    const audioUrl = this.thisPodcastFileBaseUrl + encodeURI(fileName);
    const imageUrl = this.thisPodcastFileBaseUrl + this.imageName;
    const durationMS = Math.floor(getMP3Duration(mp3File) / 1000);
    // Format 01:35:20
    var duration = Math.floor(durationMS / (60 * 60)).toString().padStart(2, '0')
      + ':' + (Math.floor(durationMS / 60) % 60).toString().padStart(2, '0')
      + ':' + (durationMS % 60).toString().padStart(2, '0');
    // const duration = durationMS;
    const summary = tags.subtitle;
    const episodeNo = '';

    rssItemXml = rssItemXml
      .replace('{{guid}}', guid)
      // twice
      .replace('{{title}}', title)
      .replace('{{title}}', title)
      // twice
      .replace('{{htmlDescription}}', htmlDescription)
      .replace('{{htmlDescription}}', htmlDescription)
      .replace('{{pubDate}}', pubDate.toUTCString())
      // twice
      .replace('{{author}}', author)
      .replace('{{author}}', author)
      .replace('{{audioLengthBytes}}', audioLengthBytes)
      .replace('{{audioUrl}}', audioUrl)
      .replace('{{imageUrl}}', imageUrl)
      .replace('{{duration}}', duration)
      // twice
      .replace('{{summary}}', summary)
      .replace('{{summary}}', summary)
      .replace('{{episodeNo}}', episodeNo);

    return rssItemXml;
  }

  private async isAudioFile(filePath: string): Promise<boolean> {
    // Stat the file to see if we have a file or dir
    const stat = await fs.promises.stat(filePath);
    return stat.isFile() && filePath.endsWith('.mp3');
  }
}