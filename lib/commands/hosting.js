require('shelljs/global');
var prompt = require('prompt');
var util = require('../util');
var config = require('../../config');
var _ = require('lodash');
var Promise = require('bluebird');
var hosting = require('../../lib/hosting');
var inquirer = require('inquirer');
var settings = require('user-settings').file('.apostrophe-cli');
var quote = require('regexp-quote');
var get = Promise.promisify(prompt.get, { context: prompt });
var package = require('../package');

module.exports = function (program) {
  var self = this;

  program
    .command('hosting')
    .description('Deploy your site to Apostrophe Cloud Hosting')
    .option('--plan', 'Specify a hosting plan on the command line (to skip interactive prompt)')
    .action(function(shortName, options) {
      var site;
      if (!fs.existsSync('package.json')) {
        console.error('Hmm, I don\'t see package.json in the current directory. cd into your project folder first.');
      }
      return Promise.try(function() {
        return hosting.invoke('GET', 'plans')
      })
      .then(function(result) {
        prompt.start();
        if (options.plan) {
          return options;
        } else {
          return get({
            properties: {
              plan: {
                pattern: new RegExp('^(' + _.map(_.keys(result.plans), quote).join('|'), 'i'),
                message: 'Please select a hosting plan.',
                required: true
              }
            }
          });
        }
      })
      .then(function(result) {
        var name = package.read().name;
        return hosting.invoke('POST', 'sites', {
          name: name,
          plan: result.plan
        });
      })
      .then(function(_site) {
        site = _site;
        package.write(Object.assign(package.read(), {
          apostrophe: {
            siteId: site.id
          }
        }));
        return hosting.sites.waitForStatus(site.id, 'deployable');
      })
      .then(function() {
        return hosting.deploy(site.id);
      })
        .then(function() {
          return hosting.syncUp(site.id, { warnOnError: true })
        })
        .then(function() {
          console.log('Your site is up. The URL is:\n');
          console.log(site.url);
          console.log('\nYour plan is: ' + site.plan);
          console.log('\nYour IP address is: ' + site.ip);
          conole.log('\nType:\n');
          console.log('apostrophe hosting\n');
          console.log('Again at any time to see your site\'s status and more commands.');
        })
        .catch(function(e) {
          console.error(e);
          process.exit(1);
        });
    });
};

