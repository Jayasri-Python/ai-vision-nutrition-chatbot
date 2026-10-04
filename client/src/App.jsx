import { useState } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [nutrition, setNutrition] = useState(null);
  const [summary, setSummary] = useState("");

  const handleImageChange = (event) => {
  const file = event.target.files[0];

  if (!file) return;

  setImage(file);
  setImagePreview(URL.createObjectURL(file));
};
    

const handleAnalyzeMeal = async () => {
  if (!image) {
    alert("Please select a meal image first.");
    return;
  }
console.log("ANALYZE BUTTON CLICKED:", image?.name);
  try {
    const formData = new FormData();
    formData.append("meal", image);

    const response = await fetch("http://localhost:5000/api/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to analyze meal");
    }

    console.log("Meal analysis:", data);

    setNutrition(data.nutrition);
  } catch (error) {
    console.error("Analysis error:", error);
    alert("Could not analyze the meal. Please try again.");
  }
};

  const handleSendMessage = async () => {
  if (!message.trim()) return;

  const userMessage = message.trim();

  setMessages((prev) => [
    ...prev,
    {
      role: "user",
      content: userMessage,
    },
  ]);

  setMessage("");

  try {
    const response = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        nutrition: nutrition,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get AI response");
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.reply,
      },
    ]);
  } catch (error) {
    console.error("Chat error:", error);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Sorry, I couldn't process your question right now.",
      },
    ]);
  }
};
const handleGenerateSummary = () => {
  if (!nutrition) {
    alert("Please analyze a meal first.");
    return;
  }

  if (messages.length === 0) {
    alert("Please ask the chatbot at least one question first.");
    return;
  }

  const questions = messages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content);

  const answers = messages
    .filter((msg) => msg.role === "assistant")
    .map((msg) => msg.content);

  const generatedSummary = `
Meal: ${nutrition.mealName}

Nutrition:
• Calories: ${nutrition.calories} kcal
• Protein: ${nutrition.protein}g
• Carbohydrates: ${nutrition.carbohydrates}g
• Fat: ${nutrition.fat}g

Foods identified:
${nutrition.foods.map((food) => `• ${food}`).join("\n")}

Conversation:
${questions.map((question, index) => `Q: ${question}\nA: ${answers[index] || "No response"}`).join("\n\n")}

Overall:
This meal provides a combination of protein, carbohydrates, and fat. 
Consider your personal nutrition goals and portion sizes when evaluating the meal.
`;

  setSummary(generatedSummary.trim());
};

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🥗 NutriVision AI</h1>
          <p>AI-powered meal nutrition assistant</p>
        </div>
      </header>

      <main className="container">

        {/* Upload Section */}
        <section className="upload-card">
          <div className="upload-icon">📷</div>

          <h2>Analyze Your Meal</h2>

          <p>
            Upload a photo of your meal and AI will identify the food
            and estimate its nutrition.
          </p>

          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Meal preview"
              className="meal-preview"
            />
          ) : (
            <div className="upload-placeholder">
              <span>🍽️</span>
              <p>Choose a meal photo</p>
            </div>
          )}

          <label className="upload-button">
            Choose Image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </label>

          {image && (
            <p className="file-name">
              Selected: {image.name}
            </p>
          )}

          <button
  className="analyze-button"
  onClick={handleAnalyzeMeal}
  disabled={!image}
>
  🔍 Analyze Meal
</button>
        </section>

        {/* Nutrition Section */}
        {/* Nutrition Section */}
<section className="nutrition-section">
  <div className="section-heading">
    <span>🥗</span>
    <div>
      <h2>Nutrition Analysis</h2>
      <p>AI-generated estimate</p>
    </div>
  </div>

  {nutrition ? (
    <>
      <div className="meal-name">
        {nutrition.mealName}
      </div>

      <div className="nutrition-grid">

        <div className="nutrition-card">
          <span>🔥</span>
          <strong>{nutrition.calories}</strong>
          <small>Calories</small>
          <small>kcal</small>
        </div>

        <div className="nutrition-card">
          <span>💪</span>
          <strong>{nutrition.protein}g</strong>
          <small>Protein</small>
        </div>

        <div className="nutrition-card">
          <span>🌾</span>
          <strong>{nutrition.carbohydrates}g</strong>
          <small>Carbohydrates</small>
        </div>

        <div className="nutrition-card">
          <span>🥑</span>
          <strong>{nutrition.fat}g</strong>
          <small>Fat</small>
        </div>

      </div>

      <div className="foods">
        <h3>Foods Identified</h3>

        {nutrition.foods.map((food, index) => (
          <div className="food-row" key={index}>
            <span>🍽️ {food}</span>
          </div>
        ))}
      </div>

      <div className="disclaimer">
        ⚠️ {nutrition.note}
      </div>
    </>
  ) : (
    <div className="summary-placeholder">
      <p>
        Upload a meal photo and click "Analyze Meal" to see
        the nutrition estimate.
      </p>
    </div>
  )}
</section>

        {/* Chat Section */}
        <section className="chat-section">

          <div className="section-heading">
            <span>💬</span>
            <div>
              <h2>Ask About Your Meal</h2>
              <p>Chat with the AI about this meal</p>
            </div>
          </div>

          <div className="chat-box">

            {messages.length === 0 && (
              <div className="empty-chat">
                <span>🤖</span>
                <p>
                  Ask something like:
                </p>

                <div className="suggestions">
                  <button
                    onClick={() =>
                      setMessage("Is this meal high in protein?")
                    }
                  >
                    Is this high in protein?
                  </button>

                  <button
                    onClick={() =>
                      setMessage("How can I make this meal healthier?")
                    }
                  >
                    How can I make this healthier?
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
  <div
    key={index}
    className={`chat-message ${
      msg.role === "user" ? "user-message" : "assistant-message"
    }`}
  >
    <span className="message-icon">
      {msg.role === "user" ? "👤" : "🤖"}
    </span>

    <div className="message-content">
      {msg.content}
    </div>
  </div>
))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Ask a question about your meal..."
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />

            <button onClick={handleSendMessage}>
              Send
            </button>
          </div>

        </section>

        {/* Summary Section */}
<section className="summary-section">

  <div className="section-heading">
    <span>📝</span>
    <div>
      <h2>Conversation Summary</h2>
      <p>Generate a summary of your nutrition conversation</p>
    </div>
  </div>

  {summary ? (
    <div className="summary-result">
      <pre>{summary}</pre>
    </div>
  ) : (
    <div className="summary-placeholder">
      <p>
        Ask the chatbot some questions, then generate your
        nutrition conversation summary.
      </p>
    </div>
  )}

  <div className="summary-actions">
    <button
      className="summary-button"
      onClick={handleGenerateSummary}
    >
      📝 Generate Summary
    </button>

    <button
  className="whatsapp-button"
  onClick={() => {
    if (!summary) {
      alert("Please generate the summary first.");
      return;
    }

    const whatsappMessage = encodeURIComponent(
      `🥗 NutriVision AI - Meal Summary\n\n${summary}`
    );

    window.open(
      `https://wa.me/?text=${whatsappMessage}`,
      "_blank"
    );
  }}
>
  📱 Send to WhatsApp
</button>
  </div>

</section>

        

      </main>

      <footer>
        <p>
          NutriVision AI · Built with React + AI
        </p>
      </footer>

    </div>
  );
}

export default App;