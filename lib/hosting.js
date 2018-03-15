var Promise = require('bluebird');
var request = require('request-promise');
var settings = require('user-settings').file('.apostrophe');
var prompt = require('prompt');

var self = {

  invoke: function(method, verb, data, options) {
    var token = settings.get('hostingToken');
    if (!token) {
      return retry();
    }
    var base = process.env.API || 'https://apostrophecms.com/api/v1/';
    var requestOptions = {
      method: method,
      headers: {
        Authorization: 'Bearer ' + token
      },
      json: true,
      form: data
    };
    return request(base + verb, requestOptions)
    .then(function(response) {
      return response;
    })
    .catch(function(e) {
      if (e.statusCode === 401) {
        return retry();
      }
      return e;
    });

    function retry() {
      return self.login()
      .then(function() {
        return self.invoke(method, verb, data);
      });
    }
  },

  login: function() {
    var token;
    prompt.start();
    var get = Promise.promisify(prompt.get, { context: prompt });
    return get({
      properties: {
        email: {
          // one and only one @
          pattern: /^[^@]*@[^@]*$/,
          message: 'Please provide your email address. You will be sent a link to log in.',
          required: true
        }
      }
    })
    .then(function(result) {
      return self.invoke('POST', 'login', { email: result.email });
    })
    .then(function(result) {
      console.log('Waiting For You To Log In\n');
      console.log('You should receive a one-time login link by email momentarily.');
      console.log('When you click that link, this session will continue. Please be');
      console.log('sure to leave this session running.\n');
      token = result.token;
      return poll();
      function poll() {
        return self.invoke('POST', 'verify-login', { token: token })
        .then(function() {
          console.log('Login confirmed.');
          return true;
        })
        .catch(function(e) {
          if (e.statusCode === 401) {
            return Promise.delay(500)
            .then(poll);
          }
        });
      }
    })
    .then(function(result) {
      settings.set('hostingToken', result.token);
    });
  },

  sites: {
    waitForStatus: function(id, status) {
      return hosting.invoke('GET', 'sites/' + site.id)
      .then(function(site) {
        if (site.status === status) {
          return site;
        } else if (site.status === 'failed') {
          throw site.status;
        } else {
          return Promise.delay(500)
          .then(function() {
            return self.sites.waitForStatus(site.id, status);
          });
        }
      });
    }
  }
  
};

module.exports = self;
