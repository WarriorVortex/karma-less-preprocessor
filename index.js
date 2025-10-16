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

    const resolvedPath = path.dirname(filePath);
    const fileName = path.basename(filePath);

    helper.mkdirIfNotExists(resolvedPath, () => {
      const paths = path.join(resolvedPath, fileName);
      fs.promises.writeFile(paths, css, 'utf-8')
        .catch(err => log.error('Error writing file:', err))
        .finally(() => done(css));
    });
  }

  return (content, file, done) => {
    file.path = transformPath(file.originalPath);

    const translatedPaths = options.paths
      .map(elem => path.join(basePath, elem));

    const fullOptions = {
      paths: translatedPaths,
      ...options,
      ...additionalData,
    }

    less.render(content, fullOptions)
      .then(content => transformRendered(file.path, content, done))
      .catch(err => {
        log.error(`Error parsing file: \"${err.message}\"\n  at ${file.originalPath}`);
        done('');
      });
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