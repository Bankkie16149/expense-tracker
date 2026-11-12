/* global __APP_VERSION__, __BUILD_TIME__, __GIT_HASH__ */
// FinTrack Dynamic Version Utility
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v2.5.0';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
export const GIT_HASH = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : '';
