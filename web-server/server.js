const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { spawn } = require('child_process');
const port = 3000; // This is the port for the Express server

telemetry = null;
telemetryType = ""
const options = {
    cwd: '../telemetry/', // Set the working directory
};

dash="/forza-dash";

const EventEmitter = require('events');
class Emitter extends EventEmitter { };
const myEmitter = new Emitter();
const serveFile = async (filePath, contentType, response) => {
  try {
      const rawData = await fsPromises.readFile(
          filePath,
          !contentType.includes('image') ? 'utf8' : ''
      );
      const data = contentType === 'application/json'
          ? JSON.parse(rawData) : rawData;
      response.writeHead(
          filePath.includes('404.html') ? 404 : 200,
          { 'Content-Type': contentType }
      );
      response.end(
          contentType === 'application/json' ? JSON.stringify(data) : data
      );
  } catch (err) {
      console.log(err);
      myEmitter.emit('log', `${err.name}: ${err.message}`, 'errLog.txt');
      response.statusCode = 500;
      response.end();
  }
}

const server = http.createServer((req, res) => {
  // console.log(req.url, req.method);
  myEmitter.emit('log', `${req.url}\t${req.method}`, 'reqLog.txt');

  const extension = path.extname(req.url);

  let contentType;

  if(req.url == "/telemetry" && req.method === 'GET'){
    retVal = {"type": null}
    if(telemetry != null){
        retVal["type"] = telemetryType;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(retVal));
    return;
  }
  else if (req.url === '/motorsport' && req.method === 'POST') {
        if(telemetry == null){
            telemetryType = "motorsport"
            dash = "forza-dash"
            telemetry = spawn('../telemetry/fdt', ['-j'], options);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
        return;
    }
    else if (req.url === '/horizon' && req.method === 'POST') {
        if(telemetry == null){
            telemetryType = "horizon"
            dash = "forza-dash"
            telemetry = spawn('../telemetry/fdt', ['-z', '-j'], options);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
        return;
    }
    else if (req.url === '/stop' && req.method === 'POST') {
        if(telemetry != null){
            telemetryType = "";
            telemetry.kill('SIGKILL');
            telemetry = null
            dash = "forza-dash"
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
        return;
    }

  switch (extension) {
      case '.css':
          contentType = 'text/css';
          break;
      case '.js':
          contentType = 'text/javascript';
          break;
      case '.json':
          contentType = 'application/json';
          break;
      case '.jpg':
          contentType = 'image/jpeg';
          break;
      case '.png':
          contentType = 'image/png';
          break;
      case '.txt':
          contentType = 'text/plain';
          break;
      case '.otf':
          contentType = 'application/x-font-opentype';
          break;
      default:
          contentType = 'text/html';
  }

  let filePath =
      contentType === 'text/html' && req.url === '/'
          ? path.join(__dirname, 'views', 'index.html')
          : contentType === 'text/html' && req.url.slice(-1) === '/'
              ? path.join(__dirname, 'views', req.url, 'index.html')
              : contentType === 'text/html'
                  ? path.join(__dirname, 'views', req.url)
                  : path.join(__dirname, req.url);

  // makes .html extension not required in the browser
  if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

  const fileExists = fs.existsSync(filePath);

  if(req.url == "/dash"){
    serveFile(path.join(__dirname, 'views', dash+'.html'), 'text/html', res);
    return;
  }

  if (fileExists) {
      serveFile(filePath, contentType, res);
  } else {
      switch (path.parse(filePath).base) {
          case 'old-page.html':
              res.writeHead(301, { 'Location': '/new-page.html' });
              res.end();
              break;
          case 'www-page.html':
              res.writeHead(301, { 'Location': '/' });
              res.end();
              break;
          default:
              serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);
      }
  }
});
const PORT = process.env.PORT || port;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));