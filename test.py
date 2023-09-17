#!/usr/bin/env python3
from requests import request,get,put,post,patch,delete
from os import environ
from mimetypes import guess_type

host = environ.get("DEPLOY_HOST", "https://linkie.username.workers.dev")
auth = {"Authorization": environ.get("AUTH_KEY", "")}
path = environ.get("TEST_PATH", "/devtestpath")
print(f"Running tests on {host}")

try:
    # unauth get /
    req = get(host, allow_redirects=False)
    assert req.status_code == 301 and "http" in req.headers["location"] # unauth get /
    
    # auth get /
    req = get(host,headers=auth)
    assert req.status_code == 200 # auth get /
    
    # unsupported method
    req = request("OPTIONS", host)
    assert req.status_code == 405 # unsupported method
    
    # unauth requests to auth methods
    reqs = put(host),post(host),delete(host)
    assert all(req.status_code == 403 for req in reqs) # unauth requests to auth methods
    
    # auth put wo data
    req = put(host + path,data={},headers=auth)
    assert req.status_code == 400 # auth put wo data
    
#    # auth put invalid url
#    req = put(host + path,data={"u": "golf sale"},headers=auth)
#    assert req.status_code == 400 # auth put invalid url
#    # invalid urls would now be stored as files instead
    
    # auth put wo path
    req = put(host,data={"u": "http://www.example.com"},headers=auth)
    assert req.status_code == 400 # auth put wo path
    
    # auth put valid
    req = put(host + path,data={"u": "http://www.example.com/?put"},headers=auth)
    assert req.status_code == 201 # auth put valid
    req = get(host + path, allow_redirects=False)
    assert req.status_code == 302 and req.headers["location"] == "http://www.example.com/?put"
    
    # auth delete wo path
    req = delete(host,headers=auth)
    assert req.status_code == 400 # auth delete wo path
    
    # auth delete valid
    req = delete(host + path,headers=auth)
    assert req.status_code == 200 # auth delete valid
#    req = get(host + path, allow_redirects=False)
#    assert req.status_code == 404

    # auth put file valid
    fn = "package.json"
    mime = guess_type(fn)[0]
    with open(fn, "rb") as f:
        files = {'u': (fn, f, mime)}
        req = put(host + path,headers=auth,files=files)
    assert req.status_code == 201 # auth put file valid
    req = get(host + path, allow_redirects=False)
    assert req.status_code == 200 and req.headers["content-type"] == mime

except AssertionError:
    print(req,req.headers,req.text)
    raise
