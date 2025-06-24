import { Hono } from 'hono'
import bing from './bing.js'
import findaphoto from './findaphoto.js'
import wallpaper from './wallpaper.js'

const app = new Hono()

app.route('/bing', bing)
app.route('/findaphoto', findaphoto)
app.route('/wallpaper', wallpaper)

app.get('/', (c) => {
  return c.text('Hello image!')
})

export default app
