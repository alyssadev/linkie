linkie
======

A simple url shortener. Largely adapting [VandyHacks/vhl.ink](https://github.com/VandyHacks/vhl.ink) with the aim of providing a more ptpb-like experience (i.e the fewest keystrokes from a cli possible while still being reasonably secure for private use)

Deploying
---------

`wrangler deploy`

Usage
-----

`curl -n -d u=http://example.com linkie/path` will make `http://linkie/path` 302 redirect to the provided url. use .netrc to store the auth username/password (inspired by ix.io). Yes it supports emoji

`curl -n -F 'u=<-' linkie/path` will make the path 302 redirect to the url provided on stdin. Doesn't support more than one url or anything that's not a url. For instance:

```
curl -F 'u=<-' linkie/_ <<EOF
http://example.com
http://example.com?2
EOF
linkie/path => http://example.comhttp//example.com?2
```

`curl -n -d u=http://example.com linkie/_`, if you provide an underscore as the path linkie will generate a four character path from a-z0-9. if it has a collision five times in a row it'll return 500.. at that point i'd probably increase the length of the random ids in the function at the top of index.js to 5 or something, and also i should get off the internet because i've generated 36^4 short urls with this service and that's insane

See test.py for more usage and test cases
