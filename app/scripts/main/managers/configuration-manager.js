'use strict';


/**
 * Modules
 * Node
 * @constant
 */
const fs = require('fs-extra');
const path = require('path');
const util = require('util');

/**
 * Modules
 * Electron
 * @constant
 */
const electron = require('electron');
const { remote, BrowserWindow } = electron;
const app = electron.app ? electron.app : remote.app;

/**
 * Modules
 * External
 * @constant
 */
const _ = require('lodash');
const appRootPath = require('app-root-path')['path'];
const Appdirectory = require('appdirectory');
const AutoLaunch = require('auto-launch');
const electronSettings = require('electron-settings');

/**
 * Modules
 * Internal
 * @constant
 */
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));


/**
 * Application
 * @constant
 * @default
 */
const appName = global.manifest.name;
const appCurrentVersion = global.manifest.version;

/**
 * Modules
 * Configuration
 */
const autoLauncher = new AutoLaunch({ name: appName, mac: { useLaunchAgent: true } });
/** @namespace electronSettings.delete */
/** @namespace electronSettings.file */
/** @namespace electronSettings.get */
/** @namespace electronSettings.getAll */
/** @namespace electronSettings.set */
/** @namespace electronSettings.setAll */

/**
 * Filesystem
 * @constant
 * @default
 */
const appLogDirectory = (new Appdirectory(appName)).userLogs();
const appSoundDirectory = path.join(appRootPath, 'sounds').replace('app.asar', 'app.asar.unpacked');

/**
 * @constant
 * @default
 */
const defaultInterval = 1000;
const defaultDebounce = 1000;


/**
 * Get primary BrowserWindow
 * @returns {BrowserWindow}
 */
let getPrimaryWindow = () => global.mainWindow;

/**
 * Show app in menubar or task bar only
 * @param {Boolean} trayOnly - True: show dock icon, false: hide icon
 */
let setAppTrayOnly = (trayOnly) => {
    logger.debug('setAppTrayOnly');

    let interval = setInterval(() => {
        const primaryWindow = getPrimaryWindow();
        if (!primaryWindow) { return; }
        if (!primaryWindow.getBounds()) { return; }


        switch (platformHelper.type) {
            case 'darwin':
                if (trayOnly) {
                    app.dock.hide();
                } else { app.dock.show(); }
                break;
            case 'win32':
                primaryWindow.setSkipTaskbar(trayOnly);
                break;
            case 'linux':
                primaryWindow.setSkipTaskbar(trayOnly);
                break;
        }

        clearInterval(interval);
    }, defaultInterval);
};

/**
 * Configuration Items
 * @namespace
 */
let configurationItems = {
    /**
     * Application changelog
     */
    appChangelog: {
        keypath: 'appChangelog',
        default: '',
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Application's last version update
     */
    appLastVersion: {
        keypath: 'appLastVersion',
        default: appCurrentVersion,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Launch on startup
     */
    appLaunchOnStartup: {
        keypath: 'appLaunchOnStartup',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');

            this.implement(this.get());
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set', value);

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            if (value) {
                autoLauncher.enable();
            } else {
                autoLauncher.disable();
            }
        }
    },
    /**
     * Application log file
     */
    appLogFile: {
        keypath: 'appLogFile',
        default: path.join(appLogDirectory, appName + '.log'),
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Show notification badge count (macOS)
     */
    appShowBadgeCount: {
        keypath: 'appShowBadgeCount',
        default: false,
        init() {
            logger.debug(this.keypath, 'init');

            this.implement(this.get());
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            if (Boolean(value) === false) {
                app.setBadgeCount(0);
            }
        }
    },
    /**
     * Show application in menubar / taskbar only
     */
    appTrayOnly: {
        keypath: 'appTrayOnly',
        default: false,
        init() {
            logger.debug(this.keypath, 'init');

            this.implement(this.get());
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            setAppTrayOnly(value);
        }
    },
    /**
     * Window bounds
     */
    windowBounds: {
        keypath: 'windowBounds',
        default: { x: 256, y: 256, width: 320, height: 640 },
        init() {
            logger.debug(this.keypath, 'init');

            // Wait for window
            let interval = setInterval(() => {
                const primaryWindow = getPrimaryWindow();
                if (!primaryWindow) { return; }
                if (!primaryWindow.getBounds()) { return; }

                // Observe future changes
                primaryWindow.on('move', event => this.set(event.sender.getBounds()));
                primaryWindow.on('resize', event => this.set(event.sender.getBounds()));

                // Apply saved value
                this.implement(this.get());

                clearInterval(interval);
            }, defaultInterval);
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set', value);

            let debounced = _.debounce(() => {
                electronSettings.set(this.keypath, value);
            }, defaultDebounce);
            debounced();
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            const primaryWindow = getPrimaryWindow();
            if (!primaryWindow) { return; }
            if (!primaryWindow.getBounds()) { return; }

            primaryWindow.setBounds(value);
        }
    },
    /**
     * Window always on top
     */
    windowTopmost: {
        keypath: 'windowTopmost',
        default: false,
        init() {
            logger.debug(this.keypath, 'init');

            // Wait for window
            let interval = setInterval(() => {
                const primaryWindow = getPrimaryWindow();
                if (!primaryWindow) { return; }
                if (!primaryWindow.getBounds()) { return; }

                this.implement(this.get());

                clearInterval(interval);
            }, defaultInterval);
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set', value);

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            BrowserWindow.getAllWindows().forEach((browserWindow) => {
                browserWindow.setAlwaysOnTop(value);
            });
        }
    },
    /**
     * Window visibility
     */
    windowVisible: {
        keypath: 'windowVisible',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');

            // Wait for window
            let interval = setInterval(() => {
                const primaryWindow = getPrimaryWindow();
                if (!primaryWindow) { return; }
                if (!primaryWindow.getBounds()) { return; }

                // Observe future changes
                primaryWindow.on('hide', () => this.set(false));
                primaryWindow.on('show', () => this.set(true));

                // Apply saved value
                this.implement(this.get());

                clearInterval(interval);
            }, defaultInterval);
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set', value);

            let debounced = _.debounce(() => {
                electronSettings.set(this.keypath, value);
            }, defaultDebounce);

            debounced();
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            const primaryWindow = getPrimaryWindow();
            if (!primaryWindow) { return; }
            if (!primaryWindow.getBounds()) { return; }

            value === true ? primaryWindow.show() : primaryWindow.hide();
        }
    },
    /**
     * Hide notification message body
     */
    pushbulletHideNotificationBody: {
        keypath: 'pushbulletHideNotificationBody',
        default: false,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Last notification timestamp
     */
    pushbulletLastNotificationTimestamp: {
        keypath: 'pushbulletLastNotificationTimestamp',
        default: Math.floor(Date.now() / 1000) - 86400,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Repeat recent pushes on launch
     */
    pushbulletRepeatRecentNotifications: {
        keypath: 'pushbulletRepeatRecentNotifications',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Notification sound on / off
     */
    pushbulletSoundEnabled: {
        keypath: 'pushbulletSoundEnabled',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /** @namespace fs.existsSync */
    /**
     * Notification sound file
     */
    pushbulletSoundFile: {
        keypath: 'pushbulletSoundFile',
        default: path.join(appSoundDirectory, 'default.wav'),
        init() {
            logger.debug(this.keypath, 'init');

            if (!fs.existsSync(this.get())) {
                this.set(this.default);
            }
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');
            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Notification sound volume
     */
    pushbulletSoundVolume: {
        keypath: 'pushbulletSoundVolume',
        default: 0.5,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return parseFloat(electronSettings.get(this.keypath));
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, parseFloat(value));
        }
    },
    /**
     * Mirrored SMS
     */
    pushbulletSmsEnabled: {
        keypath: 'pushbulletSmsEnabled',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    }
};

/**
 * Access single item
 * @param {String} playlistItemId - Configuration item identifier
 * @returns {Object|void}
 */
let getItem = (playlistItemId) => {
    //logger.debug('getConfigurationItem', playlistItemId);

    if (configurationItems.hasOwnProperty(playlistItemId)) {
        return configurationItems[playlistItemId];
    }
};

/**
 * Get defaults of all items
 * @returns {Object}
 */
let getConfigurationDefaults = () => {
    logger.debug('getConfigurationDefaults');

    let defaults = {};
    for (let item of Object.keys(configurationItems)) {
        defaults[item] = getItem(item).default;
    }

    return defaults;
};

/**
 * Set defaults of all items
 * @param {function(*)} callback - Callback
 */
let setConfigurationDefaults = (callback = () => {}) => {
    logger.debug('setConfigurationDefaults');

    let configuration = electronSettings.getAll();
    let configurationDefaults = getConfigurationDefaults();

    electronSettings.setAll(_.defaultsDeep(configuration, configurationDefaults));

    callback();
};

/**
 * Initialize all items – calling their init() method
 * @param {function(*)} callback - Callback
 * @function
 */
let initializeItems = (callback = () => {}) => {
    logger.debug('initConfigurationItems');

    let configurationItemList = Object.keys(configurationItems);

    configurationItemList.forEach((item, itemIndex) => {
        getItem(item).init();

        // Last item
        if (configurationItemList.length === (itemIndex + 1)) {
            logger.debug('initConfigurationItems', 'complete');
            callback();
        }
    });
};

/**
 * Remove unknown items
 * @param {function(*)} callback - Callback
 * @function
 */
let removeLegacyItems = (callback = () => {}) => {
    logger.debug('cleanConfiguration');

    let savedSettings = electronSettings.getAll();
    let savedSettingsList = Object.keys(savedSettings);

    savedSettingsList.forEach((item, itemIndex) => {
        if (!configurationItems.hasOwnProperty(item)) {
            electronSettings.delete(item);
            logger.debug('cleanConfiguration', 'deleted', item);
        }

        // Last item
        if (savedSettingsList.length === (itemIndex + 1)) {
            logger.debug('cleanConfiguration', 'complete');
            callback();
        }
    });
};


/**
 * @listens Electron.App#Event:ready
 */
app.once('ready', () => {
    logger.debug('app#ready');

    // Remove item unknown
    setConfigurationDefaults(() => {
        // Initialize items
        initializeItems(() => {
            // Set Defaults
            removeLegacyItems(() => {
                logger.debug('app#will-finish-launching', 'complete');
            });
        });
    });
});

/**
 * @listens Electron.App#before-quit
 */
app.on('quit', () => {
    logger.debug('app#quit');

    // Prettify
    electronSettings.setAll(electronSettings.getAll(), { prettify: true });

    logger.debug('settings', electronSettings.getAll());
    logger.debug('file', electronSettings.file());
});

/**
 * @exports
 */
module.exports = getItem;
