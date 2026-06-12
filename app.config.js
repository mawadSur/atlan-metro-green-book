// Dynamic Expo config.
//
// Base config lives in app.json. This wrapper exists for ONE reason: the
// Android FCM config (google-services.json) is a credential, so it is NOT
// checked into git. On EAS it is injected at build time as a secret *file*
// env var (GOOGLE_SERVICES_JSON → an absolute path on the builder). Locally
// the file sits at ./google-services.json. We point android.googleServicesFile
// at whichever one is available so both `eas build` and local prebuild work.
//
// See: https://docs.expo.dev/eas/environment-variables/#file-environment-variables

const base = require('./app.json');

module.exports = ({ config }) => {
  // `config` is the parsed app.json (expo key). Fall back to require for safety.
  const expo = config && Object.keys(config).length ? config : base.expo;

  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || expo.android?.googleServicesFile || './google-services.json';

  return {
    ...expo,
    android: {
      ...expo.android,
      googleServicesFile,
    },
  };
};
