const Koa = require("koa");
const Cors = require("@koa/cors");

const router = require('./routes');
const cors = Cors({
  origin: "*",
});
const app = new Koa();

if (!process.env.GMAP_API_KEY) {
  console.error("You need to pass api key as `GMAP_API_KEY` env variable");
  process.exit(-1);
}

app.use(async (ctx, next) => {
  await next();
  console.log(ctx.url, ctx.statusCode, ctx.method, ctx.body);
});
app.use(cors);
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(process.env.PORT || 3000, function() {
  console.log("[Geocode] Listening on port", process.env.PORT || 3000);
});
