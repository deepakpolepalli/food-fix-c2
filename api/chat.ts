import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

const POLICY_DOCUMENT = `
FoodFix Customer Support Policy

1. Refund Policy
Customers may be eligible for a refund if:
- The order is cancelled by the restaurant.
- The order is not delivered.
- The delivered food is spoiled, unsafe, or not edible.
- A major item is missing from the order.
- The wrong item is delivered.

Refunds are not guaranteed automatically. Final refund approval may require review by the FoodFix support team.

2. Refund Timeline
Once approved, refunds usually take 3 to 7 business days to reflect in the customer's original payment method.
Wallet refunds may reflect faster.

3. Delay Compensation Policy
If an order is delayed, the customer may be eligible for an apology coupon depending on the delay duration and order value.
A delayed order does not always mean automatic refund.
If the customer wants exact live order status, the issue should be escalated to a human agent.

4. Cancellation Policy
Customers can cancel an order before the restaurant starts preparing it.
Once preparation has started, cancellation may not be allowed.
If the order is extremely delayed, FoodFix support may review the case.

5. Coupon Policy
Only one coupon can be applied per order unless clearly mentioned in the offer.
Coupons may fail if the order does not meet minimum order value, restaurant eligibility, location eligibility, or payment method conditions.

6. Missing or Wrong Item Policy
If an item is missing or the wrong item is delivered, the customer should report it through support.
FoodFix may ask for order details or an image.
Refund or replacement depends on verification.

7. Food Quality Policy
If food is spoiled, unsafe, spilled, leaked, or packaging is damaged, the customer should upload a clear image.
FoodFix support will review the complaint.
The customer may be eligible for refund, coupon, or replacement depending on the case.

8. Human Escalation Policy
Escalate to a human agent if:
- The customer asks for a human.
- The issue needs payment verification.
- The issue needs live order tracking.
- The issue is unclear.
- The customer is very angry.
- The AI is not sure about the answer.
`;

const textPromptTemplate = `You're a helpful assistant of a food service company called food fix,
 please respond to user's query, be courteous.
 Use the following policy document -
 {policy_document}.

 IMPORTANT RULES:
 - If the customer's query is about a food quality issue (like burnt food, bad taste, mould, stale food, wrong order texture, etc.) and they HAVE NOT uploaded an image yet, you MUST politely request them to upload a photo of the food using our image upload button. Do not issue a refund without checking the image.
 - If the question is NOT related to our policies or food quality (e.g., they ask about other topics, general knowledge, programming, weather in New York, etc.), you MUST politely refuse to answer and state that you can only answer questions related to Food Fix store policies or food quality issues.

 Here is the query - {query}.
Use the following historical conversation -
{history_text}`;

const imagePromptTemplate = `You're a helpful assistant of a food service company called food fix,
 please respond to user's query, be courteous.
 Use the following policy document -
 {policy_document}.
 Check the food quality and if the food quality is bad- food is burnt or there is mould then tell him that refund is being processed and also apologize.
 If the food is NOT corrupt (no apparent mould, not burnt, or looks normal/okay), you MUST explain that you cannot issue an automated refund because the food is not corrupt, and state that you are escalating this to a human support agent who will manually review their request.

 Here is the query - {query}.
Use the following historical conversation -
{history_text}`;

// Help parse client data URIs
function parseDataUri(dataUri: string) {
  const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return {
      mimeType: "image/png",
      data: dataUri,
    };
  }
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

// Help lazily build Gemini client
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API Credentials. Please set GEMINI_API_KEY or GOOGLE_API_KEY as an environment secret in Vercel or your local .env file."
    );
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export default async function handler(req: any, res: any) {
  // Add CORS headers so the applet is robust across dev environments
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Only POST supported." });
  }

  try {
    const { query, history, image } = req.body || {};

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const ai = getAiClient();

    // Format historical conversation
    const historyText = Array.isArray(history)
      ? history
          .map((msg: any) => `${msg.isBot ? "Assistant" : "User"}: ${msg.text}`)
          .join("\n")
      : "";

    let responseText = "";

    if (image) {
      const finalPrompt = imagePromptTemplate
        .replace("{policy_document}", POLICY_DOCUMENT)
        .replace("{query}", query)
        .replace("{history_text}", historyText);

      const parsedImage = parseDataUri(image);
      const imagePart = {
        inlineData: {
          mimeType: parsedImage.mimeType,
          data: parsedImage.data,
        },
      };

      const aiResponse = await ai.models.generateContent({
        model: MODEL,
        contents: [finalPrompt, imagePart],
      });

      responseText = aiResponse.text || "I was unable to analyze the image.";
    } else {
      const finalPrompt = textPromptTemplate
        .replace("{policy_document}", POLICY_DOCUMENT)
        .replace("{query}", query)
        .replace("{history_text}", historyText);

      const aiResponse = await ai.models.generateContent({
        model: MODEL,
        contents: finalPrompt,
      });

      responseText = aiResponse.text || "Sorry, I had trouble processing your request.";
    }

    const lowerText = responseText.toLowerCase();
    const escalated =
      lowerText.includes("escalat") ||
      lowerText.includes("human representative") ||
      lowerText.includes("manual review") ||
      lowerText.includes("human support") ||
      lowerText.includes("human agent");

    return res.status(200).json({
      text: responseText,
      escalated: escalated,
    });
  } catch (error: any) {
    console.error("Error in `/api/chat.ts` function:", error);
    return res.status(500).json({
      error: "Failed to communicate with AI support agent. Detail: " + (error.message || error),
    });
  }
}
