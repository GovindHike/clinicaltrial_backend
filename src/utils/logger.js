export const logger = {
  info(message, payload) {
    if (payload) {
      console.log(`[INFO] ${message}`, payload);
      return;
    }
    console.log(`[INFO] ${message}`);
  },
  warn(message, payload) {
    if (payload) {
      console.warn(`[WARN] ${message}`, payload);
      return;
    }
    console.warn(`[WARN] ${message}`);
  },
  error(message, payload) {
    if (payload) {
      console.error(`[ERROR] ${message}`, payload);
      return;
    }
    console.error(`[ERROR] ${message}`);
  },
};
