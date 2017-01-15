const html2text = require('html-to-text');
const fetch = require('node-fetch');
const snakeCase = require('lodash.snakecase');
const console = require('better-console');
const minimist = require('minimist');
const inquirer = require('inquirer');
const spotify = require('spotify-node-applescript');

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

const state = {
  currentSongId: null,
  arrangement: null
};

function ultimateGuitar(url) {
  return fetch(`https://tabs.ultimate-guitar.com${url}`)
    .then(r => r.text())
    .catch(bubbleUpError);
}

function fetchFirst(artist, song) {
  console.reset();

  const arrangement = state.arrangement;
  const showTab = arrangement === 'tab';

  const url = `/${artist.charAt(0)}/${snakeCase(artist)}/${snakeCase(song)}_${arrangement}.htm`; // eslint-disable-line max-len

  return ultimateGuitar(url)
    .then(html => {
      title(`${song} (${artist})`);

      const content = ((/<pre class="js-tab-content">(\s*?.*?)*?<\/pre>/).exec(html) || [])[0];

      if (content) {
        const cleanedContent = content.replace(/\n<span class="line_end"><\/span>/g, '<br />');
        const cleanedText = html2text.fromString(cleanedContent).replace(/\[\/?ch\]/g, '');
        console.info(cleanedText);
      } else {
        console.error(`No ${showTab ? 'tab' : 'chords'} found for "${song} (${artist})"`);
      }
    })
    .catch(bubbleUpError);
}

const getCurrentTrack = () => {
  return new Promise((resolve) => {
    spotify.getTrack((err, res) => resolve(err || res));
  });
};

function main() {
  if (isInManualMode) {
    fetchFirst(argv.artist, argv.song).catch(bubbleUpError).catch(onError);
  } else {
    // get the name of the song which is currently playing
    getCurrentTrack()
      .then(res => {
        if (res.id !== state.currentSongId) {
          state.currentSongId = res.id;
          return fetchFirst(res.artist, res.name);
        }
      })
      .catch(onError);

    setTimeout(main, 1000);
  }
}

const selectArrangement = {
  name: 'selectArrangement',
  message: 'Select a type of arrangement:',
  type: 'list',
  choices: [{
    name: 'Tab',
    value: 'tab'
  }, {
    name: 'Chords',
    value: 'crd'
  }]
};

inquirer.prompt([selectArrangement], a => {
  state.arrangement = a.selectArrangement;
  main();
});
