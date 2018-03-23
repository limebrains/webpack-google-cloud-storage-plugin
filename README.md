# webpack-google-cloud-storage-plugin

[![npm version](https://badge.fury.io/js/webpack-google-cloud-storage-plugin.svg)](https://badge.fury.io/js/webpack-google-cloud-storage-plugin)

A Webpack plugin to upload assets in Google Cloud Storage.

> **This plugin is a fork from [webpack-google-cloud-storage-plugin](https://github.com/syndbg/webpack-google-cloud-storage-plugin)**
>
> This fork adds the ability to set metadatas to the GCS objects (especially useful for Cache-Content).
> You can also upload arbitrary static directory, not related to Webpack with the ```staticDirs``` option.

## Installation

`npm install --save webpack-google-cloud-storage-plugin`

## Usage

```JavaScript
// In your webpack.config.js
import WebpackGoogleCloudStoragePlugin from 'webpack-google-cloud-storage-plugin';

module.exports = {
  ...
  plugins: [
    new WebpackGoogleCloudStoragePlugin({
      directory: './src',
      // NOTE: Array of filenames to include in the uploading process
      include: ['app.js'],
      // NOTE: Array of filenames to exclude in the uploading process
      exclude: ['cats.js'],
      // NOTE: Array of static directories (not related to Webpack) to be uploaded
      staticDirs: ['./static'],
      // NOTE: Options passed directly to
      // Google cloud Node Storage client.
      // This is mostly authentication-wise.
      // For more information:
      // https://github.com/GoogleCloudPlatform/google-cloud-node/tree/master/packages/storage#authentication
      storageOptions: {
        projectId: 'grape-spaceship-123',
        // keyFilename: '/path/to/keyfile.json'
        // keyFileName: './examples/my-credentials.json',
        // key: 'mykey',
        // credentials: require('/path/to/credentials.json'),
      },
      // NOTE: Options used by
      // WebpackGoogleCloudStoragePlugin
      // regarding uploading.
      uploadOptions: {
        // Where to upload files
        bucketName: 'my-bucket-name',
        // NOTE: Prefix to add in the bucket file path.
        // E.g: app.js => assets/v1/app.js,
        // file is an object with { name:, path: }.
        destinationNameFn: file =>
           path.join('assets', file.path)
        ,
        // NOTE: Function to set metadatas to objects uploaded to GCS
        metaDataFn: file => ({
          cacheContent: 'max-age=86400, s-maxage=604800, public'
        }),
        // Make gzip compressed (default: false)
        gzip: true,
        // Make file public (default: false)
        makePublic: true,
      },
    }),
  ],
};
```
## Examples

Check out the examples folder for a working demo.

Add your credentials to `storageOptions` and set `uploadOptions`.

Then you can run the demo webpack using `npm run example`.
