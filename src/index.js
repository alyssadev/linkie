// vim: tabstop=4 shiftwidth=4 expandtab

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
    return Boolean(auth_check);
}

function getHost(request) {
    return request.headers.get("Host")
}

function create_response(method, body, metadata) {
    METRICS.writeDataPoint({
        indexes: [
            metadata.status
        ],
        blobs: [
            method,
            request.cf.country,
            request.cf.asn,
            request.cf.timezone
        ]
    })
    return new Response(body, metadata)
}

async function add(request,host,path) {
    const auth = await checkAuth(request)
    if (!auth)
        return create_response(request.method, "Only GET requests allowed to unauthed users", {status:403});
    if (!request.headers.get("content-type"))
        return create_response(request.method, "No data provided", {status:400})
    if (!path) return create_response(request.method, "No path provided",{status:400})
    if (path === "_") {
        var x = 0
        while (true) {
            path = makeid(4)
            const lookup = await KV.get(path)
            if (!lookup) break
            if (x >= 5) return create_response(request.method, "Failed to generate a unique ID in 5 attempts", {status:500});
            x += 1
        }
    }
    path = path.toLowerCase()

    // URL shortening
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
        return create_response(request.method, `https://${host}/${path}`, {status:201})
    } catch (e) {
        if (e instanceof TypeError) {
            if (!dest) return create_response(request.method, "No file provided", {status:400})
            await FILES.put(path, dest, { httpMetadata: {contentType: dest.type}})
            await KV.delete(path)
            return create_response(request.method, `https://${host}/${path}`, {status:201})
        }
        else throw e;
    };
    
    return create_response(request.method, `No URL or file provided`, {status:400})
}

async function remove(request,host,path) {
    const auth = await checkAuth(request)
    if (!auth)
        return create_response(request.method, "Only GET requests allowed to unauthed users", {status:403});
    if (!path) return create_response(request.method, "No path provided",{status:400})
    path = path.toLowerCase()
    await KV.delete(path)
    await FILES.delete(path)
    return create_response(request.method, `DELETE https://${host}/${path}`, {status:200})
}

async function get(request,host,path) {
    const auth = await checkAuth(request)
    if (!path && auth) {
        const { keys } = await KV.list()
        let paths = ""
        keys.forEach(element => paths += `${element.name}\n`);
        return create_response(request.method, paths,{status:200})
    }
    if (!path) return Response.redirect(REDIR_URL,301)
    path = path.toLowerCase()

    const dest_file = await FILES.get(path)
    if (dest_file) {
        const headers = new Headers()
        dest_file.writeHttpMetadata(headers)
        headers.set("etag", dest_file.httpEtag)
        return create_response(request.method, dest_file.body, { headers, } )
    }
    const dest = await KV.get(path)
    if (dest) return Response.redirect(dest, 302)
    return create_response(request.method, "Path not found", {status:404})
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
            return create_response(request.method, "Method not allowed", {status:405})
    }
}

addEventListener('fetch', event => {
    const { request } = event;
    return event.respondWith(handleRequest(request));
});
