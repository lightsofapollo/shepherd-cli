var debug = require('debug')('shepherd-cli:setup_github_project'),
    Github = require('github');

var EVENT_TYPES = [
  'pull_request',
  'status'
];

function setup(userRepo, shepherdURL) {
  userRepo = userRepo.split('/');

  var user = userRepo[0],
      repo = userRepo[1];

  //  get the repo
  if (!user || !repo) {
    console.error('  must pass user/repo');
    this.outputHelp();
    return process.exit(1);
  }

  // verify we have a token
  if (!this.ghToken) {
    console.error(' must pass --gh-token');
    this.outputHelp();
    return process.exit(1);
  }

  // create the client
  var gh = new Github({
    version: '3.0.0',
    debug: process.env.DEBUG
  });

  gh.authenticate({ type: 'oauth', token: this.ghToken });

  /**
  add the needed hooks so shepherd can link pull requests.
  */
  function setupHooks() {
    debug('setting up hooks');

    gh.repos.createHook({
      user: user,
      repo: repo,
      name: 'web',
      events: EVENT_TYPES, 
      active: true,
      config: { url: shepherdURL, content_type: 'json' }
    }, function(err, result) {
      if (err) throw err;
      console.log(result);
      debug('added hooks');
    });
  }

  // check existing hooks
  gh.repos.getHooks(
    { user: user, repo: repo, per_page: 100 },
    function(err, list) {
      debug('getting hooks', list);
      if (err) throw err;
      if (!list || !list.length) return setupHooks();

      // validate we have all the hooks
      var hasValidHook = false;

      for (var i = 0, len = list.length; i < len; i++) {
        var hook = list[i];
        if (!hook.config || hook.config.url !== shepherdURL) continue;

        hasValidHook = EVENT_TYPES.every(function(event) {
          return hook.events.indexOf(event) !== -1;
        });

        if (hasValidHook) break;
      }

      if (!hasValidHook) {
        setupHooks();
      } else {
        debug('hooks already setup');
      }
    }
  );
}

module.exports = setup;
