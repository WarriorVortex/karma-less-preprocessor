const less = require('less');
const path = require('path');
const fs = require('fs');

const createLessPreprocessor = (args, configuration, basePath, logger, helper) => {
  const config = configuration ?? {};
  const options = {
    compress: false,
    save: false,
    paths: [],
    ...config.options,
  };
  const additionalData = config.additionalData ?? {};
  const log = logger.create('preprocessor:less');

  const transformPath = args.transformPath
      ?? config.transformPath
      ?? (filePath => filePath.replace(/\.less$/, '.css'));

  const transformRendered = (filePath, content, done) => {
    const { css } = content;

    if (!options.save) {
      done(css);
      return;
    }

    const resolvedPath = path.resolve(filePath.replace(/\/([.a-zA-Z0-9\-_]+).css$/, '/'));

    helper.mkdirIfNotExists(resolvedPath, () => {
      const matches = filePath.match(/[a-zA-Z\-._]+.css$/);
      const paths = path.join(resolvedPath, ...matches);
      fs.promises.writeFile(paths, css, 'utf-8')
        .then(() => done(css))
        .catch(err => log.error('Error writing file:', err));
    });
  }

  return (content, file, done) => {
    file.path = transformPath(file.originalPath);

    const translatedPaths = options.paths
      .map(elem => `${basePath}/${elem}`);

    const fullOptions = {
      paths: translatedPaths,
      ...options,
      ...additionalData,
    }

    less.render(content, fullOptions)
      .then(content => transformRendered(file.path, content, done))
      .catch(err => log.error(`Error parsing file: \"${err.message}\"\n  at ${file.originalPath}`));
  }
};

createLessPreprocessor.$inject = [
  'args',
  'config.lessPreprocessor',
  'config.basePath',
  'logger',
  'helper'
];

// PUBLISH DI MODULE
module.exports = {
  'preprocessor:less': ['factory', createLessPreprocessor]
};