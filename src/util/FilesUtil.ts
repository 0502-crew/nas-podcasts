import * as fs from 'fs';
import path = require('path');

export class FilesUtil {
  public static async listPodcasts(rootFolder: string, rssBaseUrl: string): Promise<string[]> {
    const podcastFolders = await fs.promises.readdir(rootFolder);

    const podcasts: string[] = [];

    for (const podcastFolder of podcastFolders) {
      const podcastFolderPath = path.join(rootFolder, podcastFolder);
      const stat = await fs.promises.stat(podcastFolderPath);
      if (stat.isDirectory()) {
        podcasts.push(rssBaseUrl + '/' + encodeURI(podcastFolder));
      }
    }
    return podcasts;
  }
}