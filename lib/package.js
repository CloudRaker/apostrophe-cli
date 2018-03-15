var fs = require('fs');

module.exports = {
  read: function() {
    return JSON.parse(fs.readFileSync(require(process.cwd() + '/' + 'package.json')));
  },
  write: function(obj) {
    fs.writeFileSync(require(process.cwd() + '/' + 'package.json'), JSON.stringify(obj));
  }
};
