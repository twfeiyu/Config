/*
  Loon 脚本：拦截请求并返回 204 No Content
*/

$done({
    response: {
        status: 204,
        headers: {
            "Content-Type": "text/plain",
            "Access-Control-Allow-Origin": "*"
        },
        body: ""
    }
});
