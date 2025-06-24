import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import image from './routes/image/index.js'
import v1 from './routes/v1/index.js'

const app = new Hono()

// Serve static files
app.use('/static/*', serveStatic({ root: './' }))

app.route('/image', image)
app.route('/api/v1', v1)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
