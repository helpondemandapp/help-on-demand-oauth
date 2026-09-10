function handler(event) {
  var request = event.request;
  var hostHeader = request.headers && request.headers.host ? request.headers.host.value : '';
  var uri = request.uri;

  if (uri === '/') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: {
          value: 'https://' + hostHeader + '/login',
        },
      },
    };
  }

  if (uri.indexOf('/api/') !== 0 && uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }

  return request;
}
