import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

app.post("/api/generate-quiz", async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return c.json({ error: "No image provided" }, 400);
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const mimeType = imageFile.type || "image/jpeg";

    // Step 1: Extract text from image using vision model
    const visionResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract every word and formula from this image clearly. Output only the raw text.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2048,
        }),
      }
    );

    if (!visionResponse.ok) {
      const error = await visionResponse.text();
      console.error("Vision API error:", error);
      return c.json({ error: "Failed to analyze image" }, 500);
    }

    const visionData = (await visionResponse.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const extractedText = visionData.choices[0]?.message?.content;

    if (!extractedText) {
      return c.json({ error: "Could not extract text from image" }, 400);
    }

    console.log("Extracted text:", extractedText.substring(0, 200) + "...");

    // Step 2: Generate quiz from extracted text
    const quizResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are an expert examiner. Based on the provided text, create 5 high-quality MCQs. You MUST return ONLY a JSON array in this format: [{"question": "", "options": ["option1", "option2", "option3", "option4"], "answer": "correct_option", "explanation": ""}]. IMPORTANT: Each question MUST have exactly 4 options. Do NOT include letter prefixes like "A.", "B.", "C.", "D." in the options - just the answer text. The "answer" field must exactly match one of the options. Make sure each question tests understanding of the content. Return ONLY valid JSON, no other text.`,
            },
            {
              role: "user",
              content: `Create a 5-question quiz based on this educational content:\n\n${extractedText}`,
            },
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      }
    );

    if (!quizResponse.ok) {
      const error = await quizResponse.text();
      console.error("Quiz API error:", error);
      return c.json({ error: "Failed to generate quiz" }, 500);
    }

    const quizData = (await quizResponse.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const quizContent = quizData.choices[0]?.message?.content;

    if (!quizContent) {
      return c.json({ error: "Failed to generate quiz content" }, 500);
    }

    console.log("Quiz response:", quizContent.substring(0, 200) + "...");

    // Parse the JSON response
    let questions: QuizQuestion[];
    try {
      // Clean up the response - sometimes LLMs wrap JSON in markdown code blocks
      let cleanedContent = quizContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      questions = JSON.parse(cleanedContent);

      // Validate the structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid quiz format");
      }

      // Ensure each question has the required fields and clean up options
      questions = questions.slice(0, 5).map((q) => {
        // Clean options - remove letter prefixes like "A.", "B.", etc.
        const cleanOption = (opt: string) => 
          opt.replace(/^[A-Da-d][\.\)\:\-]\s*/, '').trim();
        
        let options = Array.isArray(q.options) 
          ? q.options.map(cleanOption).slice(0, 4) 
          : ["Option 1", "Option 2", "Option 3", "Option 4"];
        
        // Ensure exactly 4 options
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
        
        // Clean the answer too
        const cleanedAnswer = cleanOption(q.answer || "");
        const answer = options.includes(cleanedAnswer) ? cleanedAnswer : options[0];
        
        return {
          question: q.question || "Question",
          options,
          answer,
          explanation: q.explanation || "No explanation provided.",
        };
      });
    } catch (parseError) {
      console.error("Failed to parse quiz JSON:", parseError, quizContent);
      return c.json({ error: "Failed to parse quiz response" }, 500);
    }

    return c.json({ questions });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
