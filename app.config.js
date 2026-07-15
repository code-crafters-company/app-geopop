const app = require('./app.json').expo;

module.exports = {
  ...app,
  android: {
    ...app.android,
    config: {
      ...app.android.config,
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID || '',
      },
    },
  },
};
