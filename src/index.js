const vm = require('vm');

const { getAbellInBuiltSandbox } = require('./utils.js');
const compile = require('./compiler.js');

/**
 * Outputs vanilla html string when abell template and sandbox is passed.
 *
 * @param {String} abellTemplate - String of Abell File.
 * @param {Object} userSandbox
 * Object of variables. The template will be executed in context of this sandbox.
 * @param {Object} options additional options e.g ({basePath})
 * @return {String|Object} htmlTemplate
 */
function render(abellTemplate, userSandbox = {}, options = {}) {
  userSandbox = { ...userSandbox, ...getAbellInBuiltSandbox(options) };
  const context = new vm.createContext(userSandbox); // eslint-disable-line
  const htmlOutput = compile(abellTemplate, context, options);
  return htmlOutput;
}

const abellCode = `
{{ 
  const a = 3;
  const b = 9;
}}

<body>
  {{ a + b }}
  {{ c }}
</body>
`;

console.log(render(abellCode, { c: 'Hello' }));

module.exports = { render };
