linkie
======

A simple url shortener. Largely adapting [VandyHacks/vhl.ink](https://github.com/VandyHacks/vhl.ink) with the aim of providing a more ptpb-like experience (i.e the fewest keystrokes from a cli possible while still being reasonably secure for private use)

Deploying
---------

`wrangler deploy`

Usage
-----

`curl -n -d u=http://example.com linkie/path` will make `http://linkie/path` 302 redirect to the provided url. use .netrc to store the auth username/password (inspired by ix.io)

See test.py for more usage and test cases
