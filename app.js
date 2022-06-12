let response;
const VERIFY_TOKEN = "YOUR_WEBHOOK_VERIFICATION_TOKEN_HERE"; // [Facebook Developers -> WhatsApp -> Configuration -> Webhook -> Verify token]
const API_HOSTNAME = "graph.facebook.com";
const API_PATH = "/v13.0/115095327872757/messages";
const TOKEN = "YOUR_API_TOKEN_HERE"; // [Facebook Developers -> WhatsApp -> Getting Started -> Temporary access token] OR [Facebook Developers -> WhatsApp -> Configuration -> Permanent token]
const BOT_NAME = "YOUR_BOT_NAME_HERE";

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

exports.lambdaHandler = async (event, context) => {
  try {
    console.log("Event received: " + JSON.stringify(event));

    const path = event?.rawPath;
    const method = event?.requestContext?.http?.method;
    const params = event?.queryStringParameters;
    const body = event.body ? JSON.parse(event.body) : "";

    if (path === "/webhook") {
      if (method === "POST") {
        console.log("Incoming webhook POST: " + JSON.stringify(body));

        if (body) {
          response = {
            statusCode: 200,
          };

          const username =
            body?.entry[0]?.changes[0]?.value?.contacts[0]?.profile?.name;
          const whatsappId =
            body?.entry[0]?.changes[0]?.value?.contacts[0]?.wa_id;
          const from = body?.entry[0]?.changes[0]?.value?.messages[0]?.from;
          const message =
            body?.entry[0]?.changes[0]?.value?.messages[0]?.text?.body;

          const https = require("https");

          const getStatus = () =>
            new Promise((resolve, reject) => {
              const postData = JSON.stringify({
                messaging_product: "whatsapp",
                preview_url: false,
                recipient_type: "individual",
                to: from,
                type: "text",
                text: {
                  body: `Hi ${username}, \n\nMy name is ${BOT_NAME}\n\nYour phone number is '${from}' and you wrote me '${message}'.\n\nPlease give me moment to process your request ...`,
                },
              });
              const options = {
                hostname: API_HOSTNAME,
                port: 443,
                path: API_PATH,
                method: "POST",
                headers: {
                  Authorization: "Bearer " + TOKEN,
                  "Content-Type": "application/json",
                },
              };
              const req = https.request(options, (res) => {
                let buffer = "";
                res.on("data", (chunk) => (buffer += chunk));
                res.on("end", () => resolve(JSON.parse(buffer)));
              });
              req.on("error", (e) => reject(e.message));
              req.write(postData);
              req.end();
            });

          var status_info = await getStatus();

          response = {
            statusCode: 200,
            body: JSON.stringify(status_info),
          };
        } else {
          response = {
            statusCode: 404,
          };
        }
      } else if (method === "GET") {
        console.log("Incoming webhook GET: " + JSON.stringify(params));

        let mode = params["hub.mode"];
        let token = params["hub.verify_token"];
        let challenge = params["hub.challenge"];

        if (mode && token) {
          if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            response = {
              statusCode: 200,
              body: challenge,
            };
          } else {
            response = {
              statusCode: 403,
            };
          }
        } else {
          response = {
            statusCode: 404,
          };
        }
      }
    }
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};
