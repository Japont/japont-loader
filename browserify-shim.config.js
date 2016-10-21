/* eslint-disable quote-props */
const config = {
  legacy: {
    'jszip': {
      exports: 'global:JSZip',
    },
  },
  modern: {
    'jszip': {
      exports: 'global:JSZip',
    },
    'isomorphic-fetch': {
      exports: 'global:fetch',
    },
  },
};

module.exports = config[process.env.SHIM_ENV || 'modern'];
