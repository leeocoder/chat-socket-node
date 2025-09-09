const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
app.use(express.static(path.join(__dirname, '../public')));

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
