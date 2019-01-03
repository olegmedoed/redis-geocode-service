const utils = require("util");
const Koa = require("koa");
const Router = require("koa-router");
const GMaps = require("@google/maps");
const Cache = require("cacheman-redis");

const cache = new Cache();

const cacheGet = utils.promisify(cache.get.bind(cache));
const cacheSet = utils.promisify(cache.set.bind(cache));

const app = new Koa();
const router = new Router();

if (!process.env.GMAP_API_KEY) {
  console.error("You need to pass api key as `GMAP_API_KEY` env variable");
  process.exit(-1);
}

const gMapsClient = GMaps.createClient({
  key: process.env.GMAP_API_KEY,
  Promise,
});

const DAY_IN_SEC = 60 * 60 * 24;

const missingPlaceIdErrorMsg = {
  error: {
    message: "You need to send `placeId` as query parameter",
  },
};

const missingAddressErrorMsg = {
  error: {
    message: "You need to send `address` as query parameter",
  },
};

router.get("/api/reverse-geocode", async ctx => {
  const placeId = ctx.query.place_id;

  if (!placeId) {
    return sendError(ctx, missingPlaceIdErrorMsg);
  }

  const result = await cacheGet(placeId);

  if (result) {
    return sendResult(ctx, result);
  }

  let geoResp;
  try {
    geoResp = await gMapsClient
      .reverseGeocode({ place_id: placeId })
      .asPromise();
  } catch (err) {
    return sendError(ctx, err.json);
  }

  await cacheSet(placeId, geoResp.json.results, DAY_IN_SEC).catch(
    console.error
  );

  sendResult(ctx, geoResp.json.results);
});

router.get("/api/geocode", async ctx => {
  const address = ctx.query.address.toLowerCase();

  if (!address) {
    return sendError(ctx, missingAddressErrorMsg);
  }

  const result = await cacheGet(address);

  if (result) {
    return sendResult(ctx, result);
  }

  let geoResp;
  try {
    geoResp = await gMapsClient
      .geocode({ address })
      .asPromise();
  } catch (err) {
    return sendError(ctx, err.json);
  }

  await cacheSet(address, geoResp.json.results, DAY_IN_SEC).catch(
    console.error
  );

  sendResult(ctx, geoResp.json.results);
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(process.env.PORT || 3000, function() {
  console.log("[Geocode] Listening on port", process.env.PORT || 3000);
});

//
// ===== where =====
//

function sendError(ctx, error) {
  console.error(error);
  ctx.statusCode = 400;
  ctx.type = "json";
  ctx.body = error;
}

function sendResult(ctx, result) {
  console.log("Send cached result");
  ctx.statusCode = 200;
  ctx.type = "json";
  ctx.body = {
    status: "OK",
    data: result,
  };
}
