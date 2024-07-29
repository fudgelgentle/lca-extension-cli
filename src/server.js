const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/api/endpoint', (req, res) => {
    res.send('Hello from the server!');
});

app.post('/api/endpoint', (req, res) => {
    // Your endpoint logic here
    res.json(req.body);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});