import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
async function generateGeminiResponse(contents, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Gemini attempt ${attempt}/${maxRetries}...`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
      });

      return response;
    } catch (error) {
      const message = error?.message || "";

      const isTemporaryError =
        error?.status === 503 ||
        error?.code === "EAI_AGAIN" ||
        message.includes("EAI_AGAIN") ||
        message.includes("fetch failed") ||
        message.includes("high demand");

      if (!isTemporaryError || attempt === maxRetries) {
        throw error;
      }

      const delay = attempt * 3000;

      console.log(
        `Temporary Gemini error. Retrying in ${delay / 1000} seconds...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
  })
);

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "NutriVision API is running",
  });
});

app.post("/api/analyze", upload.single("meal"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "No meal image was uploaded",
    });
  }

  try {
    console.log("Analyzing image with Gemini...");
    console.log("Filename:", req.file.originalname);
    console.log("MIME type:", req.file.mimetype);
    console.log("Size:", req.file.size, "bytes");

    const base64Image = req.file.buffer.toString("base64");

    const prompt = `
Analyze this food image for a nutrition app.

Identify the main foods visible in the image and provide an estimated nutrition analysis.

Return ONLY valid JSON in exactly this structure:

{
  "mealName": "name of the meal",
  "calories": 0,
  "protein": 0,
  "carbohydrates": 0,
  "fat": 0,
  "fiber": 0,
  "foods": [
    "food 1",
    "food 2"
  ],
  "note": "These values are estimates based on the visible portion and image."
}

Important:
- calories should be a number in kcal
- protein, carbohydrates, fat and fiber should be numbers in grams
- foods should contain the foods you can actually identify
- Do not invent foods that are not reasonably visible
- Nutrition values are estimates, not exact measurements
`;

    const response = await generateGeminiResponse([
  {
    inlineData: {
      mimeType: req.file.mimetype,
      data: base64Image,
    },
  },
  {
    text: prompt,
  },
]);

    let resultText = response.text;

    console.log("Gemini response:");
    console.log(resultText);

    // Remove markdown code fences if Gemini adds them
    resultText = resultText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const nutrition = JSON.parse(resultText);

    res.json({
      success: true,
      filename: req.file.originalname,
      nutrition,
    });
  } catch (error) {
    console.error("Gemini analysis error:", error);

    res.status(500).json({
      error: "Could not analyze the meal image.",
      details: error.message,
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, nutrition } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      error: "Message is required",
    });
  }

  try {
    const nutritionContext = nutrition
      ? `
Meal: ${nutrition.mealName}
Calories: ${nutrition.calories} kcal
Protein: ${nutrition.protein} g
Carbohydrates: ${nutrition.carbohydrates} g
Fat: ${nutrition.fat} g
Fiber: ${nutrition.fiber ?? "not available"} g
Foods identified: ${(nutrition.foods || []).join(", ")}
`
      : "No meal has been analyzed yet.";

    const prompt = `
You are NutriVision, a friendly AI nutrition assistant.

The user has analyzed the following meal:

${nutritionContext}

User's question:
${message}

Answer the user's question using the meal information above.

Rules:
- Be helpful and easy to understand.
- Give practical nutrition advice.
- If nutrition values are estimates, clearly say they are estimates.
- Do not invent foods or nutrition values that are not provided.
- Keep the answer concise but useful.
- Do not claim to diagnose or treat medical conditions.
`;

    const response = await generateGeminiResponse([
      {
        text: prompt,
      },
    ]);

    const reply = response.text.trim();

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Gemini chat error:", error);

    res.status(500).json({
      error: "Could not get an AI response.",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NutriVision API running on port ${PORT}`);
});