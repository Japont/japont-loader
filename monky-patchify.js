const Transform = require('stream').Transform;

module.exports = function monkyPatchify(browserify) {
  function createStream() {
    let firstChunk = true;
    const stream = new Transform({
      transform(buf, enc, next) {
        if (firstChunk) {
          this.push(new Buffer(';'));
          firstChunk = false;
        }
        this.push(buf);
        next();
      },
    });
    return stream;
  }

  browserify.on('bundle', () => {
    browserify.pipeline.get('wrap').push(createStream());
  });
};
