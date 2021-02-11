const keys = require('./keys');
const redis = require('redis');

// create Redis client
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

// duplicate prior Redis client
const sub = redisClient.duplicate();

// define fibonnaci function (recursive)
function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
};

// listen for new entries to Redis and call fib()
sub.on('message', (channel, message) => {
    // store in hash set the message (index) and calculated fib number
    redisClient.hset('values', message, fib(parseInt(message)));
});
// configure subscription to fire on Redis insertions
sub.subscribe('insert')

