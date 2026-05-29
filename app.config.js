const appJson = require('./app.json');

function resolveGoogleMapsKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

module.exports = () => {
  const config = appJson.expo;
  const googleMapsKey = resolveGoogleMapsKey();

  return {
    ...config,
    plugins: [
      ...(config.plugins || []).filter((plugin) => plugin !== 'react-native-maps'),
      ...(googleMapsKey
        ? [
            [
              'react-native-maps',
              {
                androidGoogleMapsApiKey: googleMapsKey,
                iosGoogleMapsApiKey: googleMapsKey,
              },
            ],
          ]
        : []),
    ],
  };
};
