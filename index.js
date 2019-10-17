var argv = require('minimist')(process.argv.slice(2), { boolean: true });

const fs = require('fs');
const utils = require('./utils');
const path = require('path');

const config = require('./config.json');

const auth = process.env.AUTH || argv.auth || config.auth;
console.log(auth);
const cache = config.cache;

(async () => {
  if (argv.help) {
    utils.logHelp();
    process.exit(0)
  } else if (!auth) {
    console.log('Error: No YoutubeV3 API_KEY provided.\n')
  } else if (argv.cache) {
    const playlistIds = utils.parsePlaylists([...argv._, ...config.playlistIds]);
    const newVideos = await Promise.all(
      playlistIds.map(playlistId => utils.getNewVideosWithCache({ auth, playlistId, cache }))
    ).then(videos => videos.reduce((acc, curr) => Object.assign(acc, curr), {}));

    await Promise.all(Object.keys(newVideos).map(videoId => utils.downloadConvert({
      id: videoId, title: newVideos[videoId].title
    })));

    await utils.moveMusic();

    Object.assign(config.cache, newIVideos);
    config.playlistIds = utils.removeDuplicates([...config.playlistIds, ...playlistIds]);
    await Promise.resolve().then(() => fs.writeFile('./config.json', JSON.stringify(config), () => console.log('Cache updated!')));

  }
})().catch(error => console.log(error))

// (async () => {
//   const newVids = [];
//   config.playlistsIds.forEach()
// })()



