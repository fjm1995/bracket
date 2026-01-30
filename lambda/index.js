const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "BracketTournaments";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  // API Gateway v2 HTTP API format
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || "/";
  const pathParams = event.pathParameters || {};
  
  console.log("Method:", method, "Path:", path);
  
  // Handle CORS preflight
  if (method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // GET /tournaments - List all tournaments
    if (method === "GET" && path === "/prod/tournaments") {
      const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Items || [])
      };
    }

    // GET /tournaments/{id} - Get single tournament
    if (method === "GET" && pathParams.id) {
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: pathParams.id }
      }));
      if (!result.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
    }

    // POST /tournaments - Create/Update tournament
    if (method === "POST") {
      const body = JSON.parse(event.body);
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: body
      }));
      return { statusCode: 200, headers, body: JSON.stringify(body) };
    }

    // PUT /tournaments/{id} - Update tournament
    if (method === "PUT" && pathParams.id) {
      const body = JSON.parse(event.body);
      body.id = pathParams.id; // Ensure ID matches path
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: body
      }));
      return { statusCode: 200, headers, body: JSON.stringify(body) };
    }

    // DELETE /tournaments/{id} - Delete tournament
    if (method === "DELETE" && pathParams.id) {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: pathParams.id }
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: pathParams.id }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request", path, method }) };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
