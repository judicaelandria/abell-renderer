const fs = require('fs');
const path = require('path');
const { getAbellInBuiltSandbox, execRegexOnAll } = require('./utils.js');

/**
 * Turns <Nav props={hello: 'hi'}/> to {{ Nav({hello: 'hi}).renderedHTML }}
 * @param {string} abellTemplate
 * @return {string}
 */
function componentTagTranspiler(abellTemplate) {
  abellTemplate = String(abellTemplate);
  // eslint-disable-next
  const componentVariables = execRegexOnAll(
    /(?:const|var|let) (\w*) *?= *?require\(["'`](.*?)\.abell["'`]\)/g,
    abellTemplate
  ).matches.map((match) => match[1]);

  if (componentVariables.length <= 0) {
    return abellTemplate;
  }

  let newAbellTemplate = '';
  const componentParseREGEX = new RegExp(
    `\<(${componentVariables.join('|')}).*?(?:props=(.*?))?\/\>`,
    'gs'
  );

  const { matches: componentMatches } = execRegexOnAll(
    componentParseREGEX,
    abellTemplate
  );

  let lastIndex = 0;
  for (const componentMatch of componentMatches) {
    newAbellTemplate +=
      abellTemplate.slice(lastIndex, componentMatch.index) +
      `{{ ${componentMatch[1]}(${componentMatch[2]}).renderedHTML }}`;

    lastIndex = componentMatch[0].length + componentMatch.index;
  }

  newAbellTemplate += abellTemplate.slice(lastIndex);

  return newAbellTemplate;
}

/**
 * Parse string attributes to object
 * @param {string} attrString
 * @return {object}
 */
function parseAttributes(attrString) {
  const attributeMatches = attrString.match(/(?:[^\s"']+|(["'])[^"]*\1)+/g);
  if (!attributeMatches) {
    return {};
  }

  return attributeMatches.reduce((prevObj, val) => {
    const firstEqual = val.indexOf('=');
    if (firstEqual < 0) {
      return {
        [val]: true
      };
    }
    const key = val.slice(0, firstEqual);
    let value = val.slice(firstEqual + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return {
      ...prevObj,
      [key]: value
    };
  }, {});
}

/**
 * Turns Given Abell Component into JavaScript Component Tree
 * @param {string} abellComponentContent Cotent of Abell Component
 * @param {string} abellComponentPath path of abell component file
 * @param {object} props
 * @param {object} options
 * @return {object}
 */
function parseComponent(
  abellComponentContent,
  abellComponentPath,
  props = {},
  options
) {
  const components = [];
  const basePath = path.dirname(abellComponentPath);

  options.basePath = basePath;
  const transformations = {
    '.abell': (abellComponentPath) => {
      /**
       * TODO: Memoize Abell Component file content
       */
      const abellComponentContent = fs.readFileSync(
        path.join(basePath, abellComponentPath),
        'utf-8'
      );

      return (props) => {
        const parsedComponent = parseComponent(
          abellComponentContent,
          path.join(basePath, abellComponentPath),
          props,
          options
        );
        components.push(parsedComponent);
        return parsedComponent;
      };
    }
  };
  const { builtInFunctions } = getAbellInBuiltSandbox(options, transformations);
  const sandbox = {
    props,
    ...builtInFunctions
  };

  const htmlComponentContent = require('./compiler.js').compile(
    abellComponentContent,
    sandbox,
    {
      filename: path.relative(process.cwd(), abellComponentPath)
    }
  );

  const templateTag = /\<template\>(.*?)\<\/template\>/gs.exec(
    htmlComponentContent
  );

  let template = '';

  if (templateTag) {
    template = templateTag[1];
  }

  const matchMapper = (contentMatch) => ({
    component: path.basename(abellComponentPath),
    componentPath: abellComponentPath,
    content: contentMatch[2],
    attributes: parseAttributes(contentMatch[1])
  });

  const styleMatches = execRegexOnAll(
    /\<style(.*?)\>(.*?)\<\/style\>/gs,
    htmlComponentContent
  ).matches.map(matchMapper);

  const scriptMatches = execRegexOnAll(
    /\<script(.*?)\>(.*?)\<\/script\>/gs,
    htmlComponentContent
  ).matches.map(matchMapper);

  const componentTree = {
    renderedHTML: template,
    components,
    props,
    styles: styleMatches,
    scripts: scriptMatches
  };

  return componentTree;
}

module.exports = {
  parseComponent,
  parseAttributes,
  componentTagTranspiler
};