// vim: tabstop=4 shiftwidth=4 expandtab

async function isAsciiFile(buf) {
    var isAscii = true;
    const view = new Uint8Array(buf)
    for (var i=0, len=view.byteLength; i<len; i++) {
        if (view[i] > 127) {
            isAscii=false
            break
        }
    }
    return isAscii
}

function makeid(length) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

async function checkAuth(request) {
    const auth = request.headers.get("Authorization");
    const auth_check = await AUTH.get(auth)
    console.log(auth, auth_check)
    return Boolean(auth_check);
}

function getHost(request) {
    return request.headers.get("Host")
}

function create_response(request, body, metadata) {
    try {
        METRICS.writeDataPoint({
            indexes: [
                metadata.status
            ],
            blobs: [
                request.method,
                request.cf.country,
                request.cf.asn,
                request.cf.timezone,
                new Date().toISOString(),
                request.headers.get("cf-connecting-ip"),
                request.headers.get("referer")
            ]
        })
    } catch (e) {
        // Metrics disabled
        if (!(e instanceof ReferenceError)) {
            throw e
        }
    }

    return new Response(body, metadata)
}

async function add(request,host,path) {
    const auth = await checkAuth(request)
    if (!auth)
        return create_response(request, "Auth required", {status:401,headers:{"www-authenticate":"Basic"}});
    if (!request.headers.get("content-type"))
        return create_response(request, "No data provided", {status:400})
    if (!path) return create_response(request, "No path provided",{status:400})
    if (path === "_") {
        var x = 0
        while (true) {
            path = makeid(4)
            const lookup = await KV.get(path)
            if (!lookup) break
            if (x >= 5) return create_response(request, "Failed to generate a unique ID in 5 attempts", {status:500});
            x += 1
        }
    }
    path = path.toLowerCase()

    const req_clone = request.clone()
    const data = await request.formData()
    const dest = data.get("u")
    try {
        var u = new URL(dest)
        if (u.host !== host) {
            await KV.put(path, dest)
        } else {
            path = u.pathname.split("/")[1]
        }
        await FILES.delete(path)
        return create_response(request, `https://${host}/${path}`, {status:201})
    } catch (e) {
        if (e instanceof TypeError) {
            if (!dest) return create_response(request, "No file provided", {status:400})
            const buf = await req_clone.arrayBuffer()
            var name = dest.name
            var type = dest.type
            if (!name || !type) {
                const is_ascii = await isAsciiFile(buf)
                if (!name) name = is_ascii ? "paste.txt" : "paste.bin"
                if (!type) type = is_ascii ? "text/plain" : "application/octet-stream"
            }
            await FILES.put(path, dest, {
                httpMetadata: {
                    contentType: type,
                    contentDisposition: `inline; filename="${name}"`
                }
            })
            await KV.delete(path)
            return create_response(request, `https://${host}/${path}`, {status:201})
        }
        else throw e;
    };
    
    return create_response(request, `No URL or file provided`, {status:400})
}

async function remove(request,host,path) {
    const auth = await checkAuth(request)
    if (!auth)
        return create_response(request, "Auth required", {status:401,headers:{"www-authenticate":"Basic"}});
    if (!path) return create_response(request, "No path provided",{status:400})
    path = path.toLowerCase()
    await KV.delete(path)
    await FILES.delete(path)
    return create_response(request, `DELETE https://${host}/${path}`, {status:200})
}

async function get(request,host,path) {
    const auth = await checkAuth(request)
    if (!path && auth) {
        const { keys } = await KV.list()
        let paths = ""
        keys.forEach(element => paths += `${element.name}\n`);
        return create_response(request, paths,{status:200})
    }
    if (!path) return Response.redirect(REDIR_URL,301)
    path = path.toLowerCase()

    const dest_file = await FILES.get(path)
    if (dest_file) {
        const headers = new Headers()
        dest_file.writeHttpMetadata(headers)
        const md = dest_file.httpMetadata
        // bug with browsers not displaying valid text/ documents inline
        if (request.headers.get("user-agent").startsWith("Mozilla/") && md.contentType.startsWith("text/")) {
            headers.set("Content-Type", "text/plain")
            headers.set("Content-Disposition", `${md.contentDisposition}; type=${md.contentType}`)
        }
        headers.set("etag", dest_file.httpEtag)
        return create_response(request, dest_file.body, { headers, } )
    }
    const dest = await KV.get(path)
    if (dest) return Response.redirect(dest, 302)
    return create_response(request, "Path not found", {status:404})
}

async function handleRequest(request) {
    const host = getHost(request)
    const url = new URL(request.url)
    var pathname = url.pathname.split("/")
    var path = pathname[1]
//    if (pathname.length > 2) var
    switch (request.method) {
        case "PUT":
        case "POST":
        case "PATCH":
            return add(request,host,path)
        case "DELETE":
            return remove(request,host,path)
        case "HEAD":
        case "GET":
            return get(request,host,path)
        default:
            return create_response(request, "Method not allowed", {status:405})
    }
}

addEventListener('fetch', event => {
    const { request } = event;
    return event.respondWith(handleRequest(request));
});
