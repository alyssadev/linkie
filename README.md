linkie [![deploy and test](https://github.com/alyssadev/linkie/actions/workflows/main.yml/badge.svg)](https://github.com/alyssadev/linkie/actions/workflows/main.yml)
======

A simple url shortener. Largely adapting [VandyHacks/vhl.ink](https://github.com/VandyHacks/vhl.ink) with the aim of providing a more ptpb-like experience (i.e the fewest keystrokes from a cli possible while still being reasonably secure for private use)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/alyssadev/linkie)

(I'm not sure how this button works, there's some setting up of KV namespaces necessary, I'd recommend following the below instructions)

Deploying
---------

* Come up with a username and password. Write them to `~/.netrc` for your target domain. e.g `machine linkie.username.workers.dev username person password password1`
* Take your username and password as `username:password`, base64 encode that string and add "Basic " at the start, this is `$AUTH_KEY`
* `wrangler kv:namespace create KV`
* `wrangler kv:namespace create AUTH`
* `wrangler kv:key put --binding AUTH "$AUTH_KEY" 1` (or any truthy value you prefer)
* `wrangler r2 bucket create files`
* Update the namespace IDs in `wrangler.toml` per the two above namespaces. For test namespaces, pass `--preview` to the namespace create commands and update the preview IDs as well
* also add the binding for the r2 bucket, `{ binding = "FILES", bucket_name = "files" }`
* While you're in wrangler.toml, update the custom domain in `routes[0].pattern` and the unauth redirect url in `vars.REDIR_URL` to your desired values
* `wrangler dev -r` to test with provided preview namespaces, or `wrangler deploy`
* Install python3 and python3-requests, then run `DEPLOY_HOST=https://linkie.username.workers.dev AUTH_KEY=$AUTH_KEY python3 test.py` to run tests to ensure linkie is functioning normally. If the script outputs nothing other than `Running on $DEPLOY_HOST`, the tests succeeded.
* If you want Github Actions to handle deploying and testing, fork this repo, add `AUTH_KEY` as an Actions secret, also create an [API token](https://dash.cloudflare.com/profile/api-tokens) with access to Workers and add another Actions secret as `CF_API_TOKEN`, and finally add a normal Actions variable with `DEPLOY_HOST` as above so the test knows what to hit

Usage
-----

`curl -n -d u=http://example.com linkie/path` will make `http://linkie/path` 302 redirect to the provided url. use .netrc to store the auth username/password (inspired by ix.io). Yes it supports emoji

`curl -n -F "u=@filename.json" linkie/path` now does file uploading to the connected R2 bucket, so that's neat. just don't forget the `u=`

`curl -n -d u=http://example.com linkie/_`, if you provide an underscore as the path linkie will generate a four character path from a-z0-9. if it has a collision five times in a row it'll return 500.. at that point i'd probably increase the length of the random ids in the function at the top of index.js to 5 or something, and also i should get off the internet because i've generated 36^4 short urls with this service and that's insane

See test.py for more usage and test cases
