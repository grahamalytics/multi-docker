const keys = require('./keys');

// Expres App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// PG Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

pgClient.on('error', () => console.log('Lost PG connection'));

// Create values table to store fib indices
pgClient.on('connect', () => {
    pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

// Redis Client Setup
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retryStrategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

// Express Route Handlers
//  test route
app.get('/', (req, res) => {
    res.send('Hi :)');
});

// all fib values route
app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values');

    res.send(values.rows);
});

// recent fib values route
app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

// 
app.post('/values', async (req, res) => {
    const index = req.body.index;
    // limit index on fib calculation to prevent long runtimes
    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }

    // insert temp value into Redis for given index
    redisClient.hset('values', index, 'Nothing yet!');
    // publish new insert event
    redisPublisher.publish('insert', index);
    // add in new fib index into PG
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({working: true});
});

app.listen(5000, err => {
    console.log('Listening');
});