const VERSION = 'v1.0.0';

const CACHE_NAME = `umsspira-core-portal-${VERSION}`;
const STATIC_CACHE = `umsspira-static-${VERSION}`;
const ASSETS_CACHE = `umsspira-assets-${VERSION}`;
const CONFIG_CACHE = `umsspira-config-${VERSION}`;
const ROUTES_CACHE = `umsspira-routes-${VERSION}`;

const ALL_CACHES = [CACHE_NAME, STATIC_CACHE, ASSETS_CACHE, CONFIG_CACHE, ROUTES_CACHE];
const CORE_ASSETS = ['/portal'];
const PRECACHE_URLS = ['/offline', '/manifest.webmanifest', '/favicon.ico'];
const PRECACHE_ICONS = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/favicon-32.png'];

const PROFILES = { default: { maxAssets: 80 }, desktop: { maxAssets: 200 }, mobile: { maxAssets: 40 } };
const DEFAULT_PROFILE = 'default';
const PROFILE_KEY = '/__sw-profile';
const IS_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';