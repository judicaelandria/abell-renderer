const fs = require('fs');
const path = require('path');

const abellRenderer = require('../../src/index.js');

const abellTemplate = fs.readFileSync(
  path.join(__dirname, 'in.abell'),
  'utf-8'
);

const { html, components } = abellRenderer.render(
  abellTemplate,
  {
    foo: 'Hehhe'
  },
  {
    allowRequire: true,
    allowComponents: true,
    basePath: __dirname
  }
);
console.log(components[1].styles);
fs.writeFileSync(path.join(__dirname, 'out.html'), html);
