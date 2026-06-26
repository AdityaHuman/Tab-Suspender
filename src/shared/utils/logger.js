export const logger = {
  debugInfo: false,
  debugError: true,

  log(id, text, ...args) {
    if (this.debugInfo) {
      console.log(`[${id}]`, text, ...args);
    }
  },

  warning(id, text, ...args) {
    if (this.debugError) {
      console.warn(`[${id}] WARNING:`, text, ...args);
    }
  },

  error(id, errorObj, ...args) {
    if (this.debugError) {
      console.error(`[${id}] ERROR:`, errorObj, ...args);
    }
  }
};
