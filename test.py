#!/usr/bin/env python3
from requests import get,put,post,delete,patch,request
from os import environ

host = environ.get("HOST", "https://linkie.alyssa-dev-smith.workers.dev")
auth = {"Authorization": environ.get("AUTH", "")}
path = environ.get("TEST_PATH", "/devtestpath")

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
    req = post(host + path,data={},headers=auth)
    assert req.status_code == 400 # auth post wo data
    req = patch(host + path,data={},headers=auth)
    assert req.status_code == 400 # auth patch wo data
    
    # auth put invalid url
    req = put(host + path,data={"u": "golf sale"},headers=auth)
    assert req.status_code == 400 # auth put invalid url
    req = post(host + path,data={"u": "golf sale"},headers=auth)
    assert req.status_code == 400 # auth post invalid url
    req = patch(host + path,data={"u": "golf sale"},headers=auth)
    assert req.status_code == 400 # auth patch invalid url
    
    # auth put wo path
    req = put(host,data={"u": "http://www.example.com"},headers=auth)
    assert req.status_code == 400 # auth put wo path
    req = post(host,data={"u": "http://www.example.com"},headers=auth)
    assert req.status_code == 400 # auth post wo path
    req = post(host,data={"u": "http://www.example.com"},headers=auth)
    assert req.status_code == 400 # auth patch wo path
    
    # auth put valid
    req = put(host + path,data={"u": "http://www.example.com/?put"},headers=auth)
    assert req.status_code == 201 # auth put valid
    req = get(host + path, allow_redirects=False)
    assert req.status_code == 302 and req.headers["location"] == "http://www.example.com/?put"
    
    req = post(host + path + "post",data={"u": "http://www.example.com/?post"},headers=auth)
    assert req.status_code == 201 # auth post valid
    req = get(host + path + "post", allow_redirects=False)
    assert req.status_code == 302 and req.headers["location"] == "http://www.example.com/?post"
    
    req = patch(host + path + "patch",data={"u": "http://www.example.com/?patch"},headers=auth)
    assert req.status_code == 201 # auth patch valid
    req = get(host + path + "patch", allow_redirects=False)
    assert req.status_code == 302 and req.headers["location"] == "http://www.example.com/?patch"
    
    # auth delete wo path
    req = delete(host,headers=auth)
    assert req.status_code == 400 # auth delete wo path
    
    # auth delete valid
    req = delete(host + path,headers=auth)
    assert req.status_code == 200 # auth delete valid
#    req = get(host + path, allow_redirects=False)
#    assert req.status_code == 404
except AssertionError:
    print(req,req.headers,req.text)
    raise
