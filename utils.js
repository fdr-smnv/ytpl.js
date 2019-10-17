const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { google } = require('googleapis');
const fs = require('fs');
const url = require('url');
const path = require('path');

const config = require('./config.json');

module.exports = {
  removeDuplicates: function (arr, fn) {
    if (!fn) fn = (el) => el;

    const dups = {};
    const resArr = [];

    for (let el of arr) {
      el = fn(el);
      const isDup = dups[el];
      dups[el] = true;
      if (!isDup) resArr.push(el)
    }

    return resArr;
  },
  downloadConvert: function ({ id, title, format = config.format, bitrate = config.bitrate, pathFrom = config.pathFrom } = {}) {
    return new Promise(resolve => {
      const url = `https://www.youtube.com/watch?v=${id}`
      const stream = ytdl(url, { format });
      ffmpeg(stream)
        .audioBitrate(bitrate)
        .format('mp3')
        .on('error', err => console.log('Error: ', err))
        .on('end', () => { console.log(`Converting done! ${title}`); resolve() })
        .save(path.join(pathFrom, `${title}.mp3`));
    }).catch(error => {
      console.log(error);
      process.exit();
    });
  },
  getNewVideosWithCache: function ({ auth = config.auth, cache = config.cache, playlistId = config.playlistId } = {}) {
    return new Promise(resolve => {
      google.youtube('v3').playlistItems.list({
        auth,
        part: 'snippet',
        playlistId,
        maxResults: 50
      })
        .then(playlist => {
          fs.writeFileSync('./g.json', JSON.stringify(playlist), (err) => { })
          const newIds = {};
          const playlistItems = playlist.data.items;
          playlistItems.forEach(item => {
            const { title, description } = item.snippet;
            const id = item.snippet.resourceId.videoId;
            if (!Object.keys(cache).includes(id)) newIds[id] = { title, description }
          });

          return newIds;
        })
        .then((newIds) => resolve(newIds))
        .catch(err => { throw err });
    });
  },
  parsePlaylists: function (playlists) {
    return module.exports.removeDuplicates(playlists, (el) => url.parse(el).host ? new URL(el).searchParams.get('list') : el);
  },
  logHelp: () => {
    console.log('help data')
  },
  moveMusic: function ({ pathFrom = config.pathFrom, pathTo = config.pathTo } = {}) {
    pathFrom = path.resolve(pathFrom);
    pathTo = path.resolve(pathTo);


    if (!fs.existsSync(pathTo) || !fs.existsSync(pathFrom)) { throw Error('Bla bla bla music pahts bla bla doesnt exist bla.') }

    return new Promise((resolve, reject) => {
      fs.readdir(pathFrom, (err, files) => {
        if (err) reject(err);
        resolve(files);
      })
    })
      .then(files => files.filter(file => path.parse(file).ext == '.mp3'))
      .then(mp3Files => {
        console.log(mp3Files)
        if (mp3Files.length == 0) { throw 'No mp3 files found' }
        return mp3Files.map(mp3 => new Promise((resolve, reject) => {
          fs.rename(path.join(pathFrom, mp3), path.join(pathTo, mp3), (err) => {
            if (err) reject(err);
            else resolve();
          })
        }).catch(error => { console.log(error) }))
      })
      .then(promises => Promise.all(promises))
      .then(() => console.log('Moving done! '))
      .catch(error => {
        console.log(error);
        process.exit()
      })
  }
}