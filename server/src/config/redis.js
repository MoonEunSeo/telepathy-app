const { createClient } = require('redis')

const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (error) => {
    console.error("Redis error:", error)
})

let connectPromise;

function connectRedis(){
    if (!connectPromise){
        connectPromise = redis.connect();
    }

    return connectPromise
}

module.exports = {
    redis,
    connectRedis
}