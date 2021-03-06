import Promise from 'bluebird';
import PropTypes from 'prop-types';
import pick from 'lodash.pick';
import merge from 'lodash.merge';
import gcs from '@google-cloud/storage';
import path from 'path';

const recursive = Promise.promisify(require('recursive-readdir'));

module.exports = class WebpackGoogleCloudStoragePlugin {
  static get schema() {
    return {
      directory: PropTypes.string,
      staticDirs: PropTypes.array,
      include: PropTypes.array,
      exclude: PropTypes.array,
      storageOptions: PropTypes.object.isRequired,
      uploadOptions: PropTypes.shape({
        bucketName: PropTypes.string.isRequired,
        forceCreateBucket: PropTypes.bool,
        gzip: PropTypes.bool,
        public: PropTypes.bool,
        destinationNameFn: PropTypes.func,
        metaDataFn: PropTypes.func,
        makePublic: PropTypes.bool,
      }),
    };
  }

  static get ignoredFiles() {
    return ['.DS_Store'];
  }

  static defaultDestinationNameFn(file) {
    return file.path;
  }

  static defaultMetaDataFn() {
    return {};
  }

  static getAssetFiles({ assets }) {
    const files = assets.map((value, name) => ({ name, path: value.existsAt }));
    return Promise.resolve(files);
  }

  static handleErrors(error, compilation) {
    const newError = new Error(`WebpackGoogleCloudStoragePlugin: ${error.stack}`);
    if (compilation.errors) {
      compilation.errors.push(newError);
    } else {
// eslint-disable-next-line no-param-reassign
      compilation.errors = [newError];
    }
  }

  constructor(options = {}) {
    PropTypes.validateWithErrors(this.constructor.schema,
                                 options,
                                 'WebpackGoogleCloudStoragePlugin');

    this.isConnected = false;

    this.storageOptions = options.storageOptions;
    this.uploadOptions = options.uploadOptions;
    this.uploadOptions.destinationNameFn = this.uploadOptions.destinationNameFn ||
      this.constructor.defaultDestinationNameFn;
    this.uploadOptions.metaDataFn = this.uploadOptions.metaDataFn ||
      this.constructor.defaultMetaDataFn;

    this.options = pick(options,
      [
        'directory',
        'include',
        'exclude',
        'staticDirs',
        'basePath',
      ]);

    this.options.exclude = this.options.exclude || [];
    this.options.staticDirs = this.options.staticDirs || [];
  }

  connect() {
    if (this.isConnected) {
      return;
    }

    this.client = gcs(merge(this.storageOptions, {
      promise: Promise,
    }));

    this.isConnected = true;
  }

  filterFiles(files) {
    return Promise.resolve(files.filter(file =>
                                        this.isIncluded(file.name) &&
                                        !this.isExcluded(file.name) &&
                                        !this.isIgnored(file.name)
      )
    );
  }

  isIncluded(fileName) {
    return this.options.include.some(include => fileName.match(new RegExp(include)));
  }

  isExcluded(fileName) {
    return this.options.exclude.some(exclude => fileName.match(new RegExp(exclude)));
  }

  isIgnored(fileName) {
    return this.constructor.ignoredFiles.some(
      ignoredFile => fileName.match(new RegExp(ignoredFile))
    );
  }

  handleFiles(files) {
    return this.filterFiles(files)
      .then(filteredFiles => this.uploadFiles(filteredFiles));
  }

  apply(compiler) {
    this.connect();

    // NOTE: Use specified directory, webpack.config.output or current dir.
    this.options.directory = this.options.directory ||
                             compiler.options.output.path ||
                             compiler.options.output.context ||
                             '.';

    compiler.plugin('done', (compilation) => {
      if (this.options.directory) {
        recursive(this.options.directory, this.options.exclude)
          .then(files => files.map(f => ({ name: path.basename(f), path: f })))
          .then(files => this.handleFiles(files))
          .catch(e => this.constructor.handleErrors(e, compilation));
      } else {
        this.constructor.getAssetFiles(compilation)
          .then(files => this.handleFiles(files))
          .catch(e => this.constructor.handleErrors(e, compilation));
      }
      this.options.staticDirs.forEach((dir) => {
        recursive(dir, this.options.exclude)
          .then(files => files.map(f => ({ name: path.basename(f), path: f })))
          .then(files => this.handleFiles(files))
          .catch(e => this.constructor.handleErrors(e, compilation));
      });
    });
  }

  uploadFiles(files = []) {
    const bucket = this.client.bucket(this.uploadOptions.bucketName);
    const uploadFiles = files.map(file =>
       bucket.upload(file.path, {
         destination: this.uploadOptions.destinationNameFn(file),
         gzip: this.uploadOptions.gzip || false,
         public: this.uploadOptions.makePublic || false,
         metadata: this.uploadOptions.metaDataFn(file),
       })
    );
    return Promise.all(uploadFiles);
  }
};
