/**
 * Utility functions for device and browser detection
 */

/**
 * Detects if the user is on iOS Safari (not Chrome/Firefox on iOS)
 * @returns {boolean} True if iOS Safari, false otherwise
 */
export const isIOSSafari = () => {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
  return isIOS && isSafari;
};

/**
 * Detects if the user is on any iOS device
 * @returns {boolean} True if iOS, false otherwise
 */
export const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Detects if the user is on Safari (any platform)
 * @returns {boolean} True if Safari, false otherwise
 */
export const isSafari = () => {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  return /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
};

/**
 * Detects if Web Audio API likely has CORS restrictions for cross-origin audio
 * This is primarily an issue on iOS Safari
 * @returns {boolean} True if likely restricted, false otherwise
 */
export const hasWebAudioCORSRestrictions = () => {
  return isIOSSafari();
};
