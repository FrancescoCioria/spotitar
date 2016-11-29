const html2text = require('html-to-text');
const fetch = require('node-fetch');
const snakeCase = require('lodash.snakecase');
const console = require('better-console');
const nodeSpotifyWebHelper = require('node-spotify-webhelper');

const spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();

console.reset = () => console.log('\x1Bc');

const title = title => (
  console.warn(`\n${title.toUpperCase()}\n${title.split('').map(() => '-').join('')}\n`)
);

const arg = process.argv[2];

if (arg !== '--tab' && arg !== '--crd') {
  console.error('\nYou must pass an argument ("--tab" or "--crd"). Aborting\n');
  process.exit(1);
}

var currentSongUri = null;


function ultimateGuitar(url) {
  return fetch(`https://tabs.ultimate-guitar.com${url}`).then(r => r.text());
}

function fetchFirst(artist, song) {
  ultimateGuitar(`/${artist.charAt(0)}/${snakeCase(artist)}/${snakeCase(song)}_${arg.replace('--', '')}.htm`)
    .then(html => {
      console.reset();
      title(`${song} (${artist})`);

      const content = ((/<pre class="js-tab-content">(\s*?.*?)*?<\/pre>/).exec(html) || [])[0];

      if (content) {
        console.info(html2text.fromString(content.replace(/\n<span class="line_end"><\/span>/g, '<br />')).replace(/\[\/?ch\]/g, ''));
      } else {
        console.error(`No ${arg === '--tab' ? 'tab' : 'chords'} found for "${song} (${artist})"`);
      }
    })
}


function main() {
  // get the name of the song which is currently playing
  spotify.getStatus((err, res) => {
    if (res.track.track_resource.uri !== currentSongUri) {
      fetchFirst(res.track.artist_resource.name, res.track.track_resource.name);
      currentSongUri = res.track.track_resource.uri;
    }
  });

  setTimeout(main, 1000);
}

main();