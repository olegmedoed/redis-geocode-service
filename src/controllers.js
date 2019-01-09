const utils = require("util");
const GMaps = require("@google/maps");
const Cache = require("cacheman-redis");
const uuid = require("uuid/v4");

const DAY_IN_SEC = 60 * 60 * 24;

const cache = new Cache({
  host: process.env.REDIS_HOST || "localhost",
});
const cacheGet = utils.promisify(cache.get.bind(cache));
const cacheSet = utils.promisify(cache.set.bind(cache));

const gMapsClient = GMaps.createClient({
  key: process.env.GMAP_API_KEY,
  Promise,
});

const missingPlaceIdErrorMsg = getErrorResponse(
  "You need to send `placeId` as query parameter"
);
const missingAddressErrorMsg = getErrorResponse(
  "You need to send `address` as query parameter"
);
const missingAutocompleteErrorMsg = getErrorResponse(
  "You need to send `input` as query parameter"
);

//
// ===== controllers =====
//

async function getReverseGeocode(ctx) {
  const placeId = ctx.query.place_id;

  if (!placeId) {
    return sendError(ctx, missingPlaceIdErrorMsg);
  }

  const result = await cacheGet("reverse-geocode:" + placeId);

  if (result) {
    console.log("Send cached result");
    return sendResult(ctx, result);
  }

  let geoResp;
  try {
    geoResp = await gMapsClient
      .reverseGeocode({ place_id: placeId })
      .asPromise();
  } catch (err) {
    return sendError(ctx, err.json || getErrorResponse(err.message || err));
  }

  await cacheSet(
    "reverse-geocode:" + placeId,
    geoResp.json.results,
    DAY_IN_SEC
  ).catch(console.error);

  console.log("Send non-cached result");
  sendResult(ctx, geoResp.json.results);
}

async function getGeocode(ctx) {
  const address = (ctx.query.address || "").toLowerCase();

  if (!address) {
    return sendError(ctx, missingAddressErrorMsg);
  }

  const result = await cacheGet("geocode:" + address);

  if (result) {
    console.log("Send cached result");
    return sendResult(ctx, result);
  }

  let geoResp;
  try {
    geoResp = await gMapsClient.geocode({ address }).asPromise();
  } catch (err) {
    return sendError(ctx, err.json || getErrorResponse(err.message || err));
  }

  await cacheSet("geocode:" + address, geoResp.json.results, DAY_IN_SEC).catch(
    console.error
  );

  console.log("Send non-cached result");
  sendResult(ctx, geoResp.json.results);
}

async function getAutocomplete(ctx) {
  const input = (ctx.query.input || "").toLowerCase();
  const types = (ctx.query.types || "(cities)").toLowerCase();
  const sessiontoken = ctx.query.sessiontoken || uuid();

  if (!input) {
    return sendError(ctx, missingAutocompleteErrorMsg);
  }

  const result = await cacheGet("autocomplete:" + input);

  if (result) {
    console.log("Send cached result");
    return sendResult(ctx, result);
  }

  let geoResp;
  try {
    geoResp = await gMapsClient
      .placesAutoComplete({ input, types, sessiontoken })
      .asPromise();
  } catch (err) {
    return sendError(ctx, err.json || getErrorResponse(err.message || err));
  }

  await cacheSet(
    "autocomplete:" + input,
    geoResp.json.predictions,
    DAY_IN_SEC
  ).catch(console.error);

  console.log("Send non-cached result");
  sendResult(ctx, geoResp.json.predictions);
}

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
  ctx.statusCode = 200;
  ctx.type = "json";
  ctx.body = {
    status: "OK",
    data: result,
  };
}

function getErrorResponse(message) {
  return {
    error: {
      message,
    },
  };
}

//
// ===== exports =====
//

module.exports = {
  getReverseGeocode,
  getGeocode,
  getAutocomplete
};
