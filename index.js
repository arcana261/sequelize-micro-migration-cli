"use strict";

const blessed = require('blessed');
const screen = blessed.screen();
const screenBackground = blessed.box({
  width: '100%',
  height: '100%',
  left: 0,
  top: 0,
  style: {
    bg: 'blue'
  }
});
screen.append(screenBackground);
const task = require('xcane').task;
const promise = require('xcane').promise;
const iterable = require('xcane').iterable;
const type = require('xcane').type;
const style = {
  bg: 'white',
  fg: 'black'
};
const buttonStyle = Object.assign({}, style, {
  bg: 'lightblue',
  fg: 'white',
  hover: {
    bg: 'red',
    fg: 'white',
    bold: true
  },
  focus: {
    bg: 'red',
    fg: 'white',
    bold: true
  }
});
const boxStyle = {
  tags: true,
  draggable: true,
  top: 'center',
  left: 'center',
  shadow: true,
  border: {
    type: 'line'
  }
};
const progress = ['-', '\\', '|', '/'];
let logWatcher = () => {};
let escapeHandlers = [() => process.exit(0)];
let enterHandlers = [() => {}];
let rightHandlers = [() => {}];
let leftHandlers = [() => {}];

screen.key(['escape', 'q', 'C-c'], (ch, key) =>
  escapeHandlers[escapeHandlers.length - 1](ch, key));

screen.key(['enter', 'space'], (ch, key) =>
  enterHandlers[enterHandlers.length - 1](ch, key));

screen.key(['right', 'up'], (ch, key) =>
  rightHandlers[rightHandlers.length - 1](ch, key));

screen.key(['left', 'down'], (ch, key) =>
  leftHandlers[leftHandlers.length - 1](ch, key));

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
    this._box = blessed.box(Object.assign({}, boxStyle, {
      width: '75%',
      height: '75%',
      style: style,
      content: '{center}{bold}Performing...{/bold}{/center}'
    }));
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
    escapeHandlers.pop();
  }

  show() {
    this._box = blessed.box(Object.assign({}, boxStyle, {
      width: '50%',
      height: '75%',
      style: style,
      content: `{center}{bold}${this._title}{/bold}{/center}`
    }));
    this._screen.append(this._box);

    blessed.line({
      parent: this._box,
      top: 1,
      orientation: 'horizontal',
      style:  style
    });

    this._table = blessed.list({
      parent: this._box,
      items: [].concat(this._items),
      style: Object.assign({}, style, {
        selected: {
          bg: 'blue',
          fg: 'white',
          bold: true
        }
      }),
      top: 2,
      left: 2,
      right: 2,
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

    escapeHandlers.push(this._cancelButtonListener);

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
    this._okButton = null;
    this._okButtonListener = null;
    enterHandlers.pop();
  }

  show() {
    this._box = blessed.box(Object.assign({}, boxStyle, {
      width: this._width,
      height: this._height,
      style: style,
      content: `{center}{bold}${this._title}{/bold}{/center}`
    }));
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
      shadow: true,
      keys: true
    });

    enterHandlers.push(this._okButtonListener);

    this._okButton.on('click', this._okButtonListener);
    this._okButton.focus();
    this._screen.render();
  }
}

class SequelizeMigrationPromptPage {
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
    this._cancelButton.removeListener('ok', this._cancelButtonListener);
    this._box.destroy();
    this._box = null;
    this._screen.render();
    this._okButton = null;
    this._cancelButton = null;
    this._okButtonListener = null;
    this._cancelButtonListener = null;
    rightHandlers.pop();
    leftHandlers.pop();
    enterHandlers.pop();
    this._rightHandler = null;
    this._enterHandler = null;
  }

  show() {
    this._box = blessed.box(Object.assign({}, boxStyle, {
      width: this._width,
      height: this._height,
      style: style,
      content: `{center}{bold}${this._title}{/bold}{/center}`
    }));
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
      this._fn(null, true);
    };

    this._cancelButtonListener = () => {
      this.hide();
      this._fn(null, false);
    };

    this._rightHandler = () => {
      if (this._screen.focused === this._okButton) {
        this._cancelButton.focus();
      } else {
        this._okButton.focus();
      }
    };

    this._enterHandler = () => {
      if (this._screen.focused === this._okButton) {
        this._okButtonListener();
      } else {
        this._cancelButtonListener();
      }
    };

    this._okButton = blessed.button({
      parent: this._box,
      content: '{center}Ok >>{/center}',
      tags: true,
      style: Object.assign({}, buttonStyle),
      bottom: 2,
      right: 2,
      height: 2,
      width: 10,
      mouse: true,
      keys: true,
      shadow: true,
      keys: true
    });

    this._cancelButton = blessed.button({
      parent: this._box,
      content: '{center}<< Cancel{/center}',
      valign: 'center',
      tags: true,
      style: Object.assign({}, buttonStyle),
      bottom: 2,
      left: 2,
      height: 2,
      width: 10,
      mouse: true,
      keys: true,
      shadow: true,
      keys: true
    });

    leftHandlers.push(this._rightHandler);
    rightHandlers.push(this._rightHandler);
    enterHandlers.push(this._enterHandler);

    this._okButton.on('click', this._okButtonListener);
    this._cancelButton.on('click', this._cancelButtonListener);

    this._okButton.focus();
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

function showPrompt(title, text, width, height) {
  return promise.fromNode(cb => {
    const page = new SequelizeMigrationPromptPage(
      screen, title, text, width, height, cb);
    page.show();
  })();
}

const watchList = [];
const moduleList = {};

const SequelizeMicroMigrationCli = module.exports = Object.freeze({
  watch: migration => {
    watchList.push(migration);
    moduleList[migration.application] = migration;
  },

  _showCurrentVersion: module =>
    moduleList[module].current().then(
      c => showInformation(`${module} current version:`, c, '40%', 12)),

  _selectVersion: (module, filter) =>
    task.spawn(function * taks() {
      const migration = moduleList[module];
      const currentVersions = yield migration.currentVersions();
      const versions = yield migration.versions();
      let all = migration.sort(Object.keys(
        currentVersions.concat(versions).reduce((prev, x) =>
          Object.assign(prev, {
            [x]: true
          }), {}))).reverse();
      const currentVersionsMap = currentVersions.reduce((prev, x) =>
        Object.assign(prev, {
          [x]: true
        }), {});
      const versionsMap = versions.reduce((prev, x) =>
        Object.assign(prev, {
          [x]: true
        }), {});

      let tags = all.map(v => {
        if (versionsMap[v]) {
          if (currentVersionsMap[v]) {
            return '*';
          }

          return ' ';
        }

        return '!';
      });

      if (type.isString(filter)) {
        all = all.filter((v, i) => tags[i] === filter);
        tags = tags.filter(v => v === filter);
      }

      const items = all.map((v, i) => `[${tags[i]}] ${v}`);

      let cont = true;
      while (cont) {
        let item = yield selectFromList(`${module} versions:`, items);
        if (type.isOptional(item)) {
          return null;
        }

        item = all[items.indexOf(item)];

        if (versionsMap[item]) {
          if (currentVersionsMap[item]) {
            return [item, 'down'];
          }
          return [item, 'up'];
        } else {
          yield showInformation('ERROR',
            `Migration {bold}${item}{/bold} is in conflict state`, '40%', 12);
        }
      }
    }),

  _selectWhere: (module, action) =>
    task.spawn(function * task() {
      const textUpgradeLatest = 'Upgrade Latest';
      const textSelectVersion = 'Select specific version';
      const textDowngrade = 'Downgrade 1 version';
      const items = action === 'up' ?
        [textUpgradeLatest, textSelectVersion] :
        [textDowngrade, textSelectVersion];

      const pick = yield selectFromList(
        `${action === 'up' ? 'Upgrade' : 'Downgrade'} ${module}`, items);

      switch (pick) {
        case textUpgradeLatest:
          return [];
        case textDowngrade:
          return [1];
        case textSelectVersion:
          return [yield SequelizeMicroMigrationCli._selectVersion(
            module, action === 'up' ? ' ' : '*')];
        default:
          return null;
      }
    }),

  _mainMenu: () =>
    task.spawn(function * task() {
      let cont = true;

      while (cont) {
        const module = yield selectFromList(
          'Select module:', watchList.map(x => x.application));

        if (type.isOptional(module)) {
          return null;
        }

        const pick = yield SequelizeMicroMigrationCli._moduleMenu(module);

        if (!type.isOptional(pick)) {
          return null;
        }
      }
    }),

  _moduleMenu: module =>
    task.spawn(function * task() {
      const textUpgrade = 'Upgrade Database';
      const textDowngrade = 'Downgrade Database';
      const textCurrentVersion = 'Current Version';
      const textMigrationReport = 'Migration Report';
      const items = [
        textUpgrade,
        textDowngrade,
        textCurrentVersion,
        textMigrationReport
      ];

      let cont = true;
      let where = null;

      while (cont) {
        switch(yield selectFromList(`Manage ${module}`, items)) {
          case textUpgrade:
            where = yield SequelizeMicroMigrationCli._selectWhere(module, 'up');

            if (type.isOptional(where)) {
              break;
            }

            break;
          case textDowngrade:
            where = yield SequelizeMicroMigrationCli._selectWhere(
              module, 'down');

            if (type.isOptional(where)) {
              break;
            }

            break;
          case textCurrentVersion:
            yield SequelizeMicroMigrationCli._showCurrentVersion(module);
            break;
          case textMigrationReport:
            yield SequelizeMicroMigrationCli._selectVersion(module);
            break;
          default:
            return null;
        }
      }
    }),

  _migrate: (module, action, where) =>
    task.spawn(function * task() {
      const migration = moduleList[module];
      let taskList = null;

      if (action === 'up') {
        if (where.length < 1) {
          taskList = migration.listUp();
        } else {
          taskList = migration.listUp(where[0]);
        }
      } else {
        if (where.length < 1) {
          taskList = migration.listDown();
        }
        // TODO: complete here
        // TODO: complete _migate method
      }
    }),

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
