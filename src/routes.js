const Router = require("koa-router");
const createValidationMdw = require("koa-router-json-schema").default;

const router = new Router();

const {
  getAutocomplete,
  getGeocode,
  getReverseGeocode,
} = require("./controllers");

router.get(
  "/api/reverse-geocode",
  createValidationMdw({
    query: {
      type: "object",
      properties: {
        place_id: {
          type: "string",
        },
      },
      required: ["place_id"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string", pattern: "OK" },
          data: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
        required: ["status", "data"],
      },
    },
  }),
  getReverseGeocode
);

router.get(
  "/api/geocode",
  createValidationMdw({
    query: {
      type: "object",
      properties: {
        address: {
          type: "string",
        },
      },
      required: ["address"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string", pattern: "OK" },
          data: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
        required: ["status", "data"],
      },
    },
  }),
  getGeocode
);

router.get(
  "/api/autocomplete",
  createValidationMdw({
    query: {
      type: "object",
      properties: {
        input: {
          type: "string",
        },
        types: {
          type: "string",
          pattern: "geocode|address|establishment|\(regions\)|\(cities\)"
        },
        sessiontoken: {
          type: "string",
        },
      },
      required: ["input"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string", pattern: "OK" },
          data: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
        required: ["status", "data"],
      },
    },
  }),
  getAutocomplete
);

module.exports = router;
