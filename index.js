const html2text = require('html-to-text');
const fetch = require('node-fetch');
const snakeCase = require('lodash.snakecase');
const console = require('better-console');
const minimist = require('minimist');
const nodeSpotifyWebHelper = require('node-spotify-webhelper');

const spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();

console.reset = () => console.log('\x1Bc');

const title = title => (
  console.warn(`\n${title.toUpperCase()}\n${title.split('').map(() => '-').join('')}\n`)
);

const bubbleUpError = (e) => { throw e; };

const onError = e => console.error(`\nError: ${e.message}\n`);

const argv = minimist(process.argv.slice(2));
const isInManualMode = argv.artist || argv.song;

if (isInManualMode && (!argv.artist || !argv.song)) {
  console.error('\nYou must pass both "--artist" and "--song". Aborting\n');
  process.exit(1);
}

if (!argv.tab && !argv.crd) {
  console.error('\nYou must pass an argument ("--tab" or "--crd"). Aborting\n');
  process.exit(1);
}

const state = {
  currentSongUri: null
};

function ultimateGuitar(url) {
  return fetch(`https://tabs.ultimate-guitar.com${url}`)
    .then(r => r.text())
    .catch(bubbleUpError);
}

function fetchFirst(artist, song) {
  console.reset();
  const url = `/${artist.charAt(0)}/${snakeCase(artist)}/${snakeCase(song)}_${argv.tab ? 'tab' : 'crd'}.htm`; // eslint-disable-line max-len
  return ultimateGuitar(url)
    .then(html => {
      title(`${song} (${artist})`);

      const content = ((/<pre class="js-tab-content">(\s*?.*?)*?<\/pre>/).exec(html) || [])[0];

      if (content) {
        const cleanedContent = content.replace(/\n<span class="line_end"><\/span>/g, '<br />');
        const cleanedText = html2text.fromString(cleanedContent).replace(/\[\/?ch\]/g, '');
        console.info(cleanedText);
      } else {
        console.error(`No ${argv.tab ? 'tab' : 'chords'} found for "${song} (${artist})"`);
      }
    })
    .catch(bubbleUpError);
}

const getSpotifyStatus = () => {
  return new Promise((resolve, reject) => {
    spotify.getStatus((err, res) => {
      if (err) {
        reject(err);
      }

      resolve(res);
    });
  });
};

function main() {
  if (!isInManualMode) {
    // get the name of the song which is currently playing
    getSpotifyStatus()
      .then(res => {
        if (res.track.track_resource.uri !== state.currentSongUri) {
          state.currentSongUri = res.track.track_resource.uri;
          return fetchFirst(res.track.artist_resource.name, res.track.track_resource.name);
        }
      })
      .catch(onError);

    setTimeout(main, 1000);
  } else {
    fetchFirst(argv.artist, argv.song).catch(bubbleUpError).catch(onError);
  }
}

main();
