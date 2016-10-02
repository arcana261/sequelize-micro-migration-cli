"use strict";

const blessed = require('blessed');
const screen = blessed.screen();
const task = require('xcane').task;
const promise = require('xcane').promise;
const iterable = require('xcane').iterable;
const type = require('xcane').type;
const style = {
  bg: 'blue'
};
const buttonStyle = Object.assign({}, style, {
  bg: '#f0f0f0',
  fg: 'blue',
  hover: {
    bg: 'white',
    fg: 'red',
    bold: true
  },
  focus: {
    bg: 'white',
    fg: 'red',
    bold: true
  }
});
const progress = ['-', '\\', '|', '/'];
let logWatcher = () => {};

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

class SequelizeMigrationPage {
  constructor(screen, total) {
    this._screen = screen;
    this._total = total;
    this._progressCounter = 0;
  }

 _makeTitle(counter) {
    return `\{center\}\{bold\}Performing ${progress[counter]}\{/bold\}\{/center\}`;
  }

  hide() {
    this._screen.remove(this._box);
    this._box = null;
    this._log = null;
    this._progressBar = null;
    this._screen.render();
  }

  show() {
    this._box = blessed.box({
      top: 'center',
      left: 'center',
      width: '75%',
      height: '75%',
      style: style,
      tags: true,
      content: '{center}{bold}Performing...{/bold}{/center}'
    });
    this._screen.append(this._box);

    blessed.line({
      parent: this._box,
      top: 1,
      orientation: 'horizontal',
      style:  style
    });

    this._log = blessed.log({
      parent: this._box,
      top: 2,
      bottom: 3,
      style: Object.assign({}, style, {
        fg: 'yellow',
        track: {
          bg: 'yellow'
        }
      })
    });

    this._progressBar = blessed.progressbar({
      parent: this._box,
      orientation: 'horizontal',
      bottom: 1,
      height: 1,
      style: {
        bar: {
          bg: 'yellow'
        }
      }
    });

    this._screen.render();
  }

  start() {
    this._handle = setInterval(() => {
      this._progressCounter = (this._progressCounter + 1) % progress.length;
      this._box.setContent(this._makeTitle(this._progressCounter));
      this._screen.render();
    }, 100);
  }

  stop() {
    clearInterval(this._handle);
  }

  add(item) {
    if (item[1] === 'up') {
      this._log.log(`Upgrading ${item[0]}...`);
    } else {
      this._log.log(`Downgrading ${item[0]}...`);
    }
    this._progressBar.progress(100 / this._total);
    this._screen.render();
  }

  error(err) {
    this._log.log(`ERROR OCCURED: ${err}`);
    if (err.stack) {
      this._log.log(err.stack);
    }
  }
}

class SequelizeMigrationSelectionPage {
  constructor(screen, title, items, fn) {
    this._screen = screen;
    this._title = title;
    this._items = items;
    this._fn = fn;
  }

  hide() {
    this._table.removeListener('select', this._selectListener);
    this._okButton.removeListener('ok', this._okButtonListener);
    this._cancelButton.removeListener('cancel', this._cancelButtonListener);
    this._box.destroy();
    this._box = null;
    this._table = null;
    this._screen.render();
    this._selectListener = null;
    this._okButtonListener = null;
    this._cancelButtonListener = null;
  }

  show() {
    this._box = blessed.box({
      top: 'center',
      left: 'center',
      width: '50%',
      height: '75%',
      style: style,
      tags: true,
      content: `{center}{bold}${this._title}{/bold}{/center}`
    });
    this._screen.append(this._box);

    blessed.line({
      parent: this._box,
      top: 1,
      orientation: 'horizontal',
      style:  style
    });

    this._table = blessed.list({
      parent: this._box,
      items: this._items,
      style: Object.assign({}, style, {
        selected: {
          bg: 'white',
          fg: 'red',
          bold: true
        }
      }),
      top: 2,
      bottom: 3,
      mouse: true,
      keys: true,
      search: true
    });

    this._selectListener = (data, index) => {
      this.hide();
      if (!type.isOptional(index)) {
        index = this._items[index];
      }
      this._fn(null, index);
    };
    this._okButtonListener = () =>
      this._selectListener(null, this._table.selected);
    this._cancelButtonListener = () => {
      this.hide();
      this._fn(null, null);
    };

    this._table.on('select', this._selectListener);

    this._cancelButton = blessed.button({
      parent: this._box,
      content: '{center}<< Cancel{/center}',
      style: Object.assign({}, buttonStyle),
      bottom: 2,
      left: 2,
      height: 2,
      width: 10,
      mouse: true,
      keys: true,
      tags: true,
      shadow: true
    });

    this._okButton = blessed.button({
      parent: this._box,
      content: '{center}Ok >>{/center}',
      tags: true,
      style: Object.assign({}, buttonStyle),
      bottom: 2,
      right: 3,
      height: 2,
      width: 10,
      mouse: true,
      keys: true,
      shadow: true
    });

    this._okButton.on('click', this._okButtonListener);
    this._cancelButton.on('click', this._cancelButtonListener);

    this._table.focus();
    this._screen.render();
  }
}

class SequelizeMigrationInformationPage {
  constructor(screen, title, text, width, height, fn) {
    this._screen = screen;
    this._title = title;
    this._text = text;
    this._width = width || '50%';
    this._height = height || '75%';
    this._fn = fn;
  }

  hide() {
    this._okButton.removeListener('ok', this._okButtonListener);
    this._box.destroy();
    this._box = null;
    this._screen.render();
    this._okButtonListener = null;
  }

  show() {
    this._box = blessed.box({
      top: 'center',
      left: 'center',
      width: this._width,
      height: this._height,
      style: style,
      tags: true,
      content: `{center}{bold}${this._title}{/bold}{/center}`
    });
    this._screen.append(this._box);

    blessed.line({
      parent: this._box,
      top: 1,
      orientation: 'horizontal',
      style:  style
    });

    blessed.text({
      parent: this._box,
      tags: true,
      top: 2,
      left: 1,
      right: 1,
      bottom: 2,
      style: style,
      content: this._text
    });

    this._okButtonListener = () => {
      this.hide();
      this._fn(null);
    };

    this._okButton = blessed.button({
      parent: this._box,
      content: '{center}Ok >>{/center}',
      tags: true,
      style: Object.assign({}, buttonStyle),
      bottom: 2,
      left: 'center',
      height: 2,
      width: 10,
      mouse: true,
      keys: true,
      shadow: true
    });

    this._okButton.on('click', this._okButtonListener);
    this._screen.render();
  }
}

function selectFromList(title, items) {
  return promise.fromNode(cb => {
    const page = new SequelizeMigrationSelectionPage(screen, title, items, cb);
    page.show();
  })();
}

function showInformation(title, text, width, height) {
  return promise.fromNode(cb => {
    const page = new SequelizeMigrationInformationPage(
      screen, title, text, width, height, cb);
    page.show();
  })();
}

const watchList = [];
const applicationList = {};

module.exports = Object.freeze({
  watch: migration => {
    watchList.push(migration);
    applicationList[migration.application] = migration;
  },

  _selectApplication: () =>
    selectFromList('Select application:', watchList.map(x => x.application)),

  _showCurrentVersion: app =>
    applicationList[app].current().then(
      c => showInformation(`${app} current version:`, c, '40%', 8)),

  requiresMigration: () =>
    iterable.async(watchList).any(x => x.requiresMigration()),

  log: t => logWatcher(t),

  migrate: () => task.spawn(function * task() {
    const taskList = yield iterable.async(watchList)
      .select(x => x.listUp().then(y => [x, y]))
      .toArray();
    const total = taskList.reduce((p, x) => p + x[1].length, 0);
    const window = new SequelizeMigrationPage(screen, total);
    window.show();
    window.start();
  })
});
