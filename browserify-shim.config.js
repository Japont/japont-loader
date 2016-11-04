/* eslint-disable quote-props */
const config = {
  legacy: {
    'jszip': {
      exports: 'global:JSZip',
    },
    'js-sha512': {
      exports: 'global:sha512',
    },
  },
  modern: {
    'jszip': {
      exports: 'global:JSZip',
    },
    'js-sha512': {
      exports: 'global:sha512',
    },
    'js-polyfills/url': {
      exports: null,
    },
    'isomorphic-fetch': {
      exports: 'global:fetch',
    },
  },
};

module.exports = config[process.env.SHIM_ENV || 'modern'];
