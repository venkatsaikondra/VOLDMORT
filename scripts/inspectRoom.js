(async function(){
  const { redis } = require('../lib/redis')
  const room = process.argv[2] || 'babyNQ0sagZoczwKlxDHC'
  try {
    const meta = await redis.hgetall(`meta:${room}`)
    console.log('meta:', meta)
    const msgs = await redis.lrange(`messages:${room}`, 0, -1)
    console.log('messages:', msgs)
  } catch (e) {
    console.error('inspect error', e)
  }
})()
