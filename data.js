const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// --- CONFIGURATION ---

// Fetch your API key from environment variables
const API_KEY = "AIzaSyCuA7YmBxaB_1C_mDyEjXfc3URL5SkJ9DM";
if (!API_KEY) {
  throw new Error("Missing GOOGLE_GEMINI_API_KEY environment variable.");
}

const TARGET_DATA_POINTS = 1000;
const BATCH_SIZE = 10; // How many new clauses to ask for in each API call
const OUTPUT_FILENAME = "trainingData.json";

// --- CORE DEFINITIONS ---

const typeList = [
    { type: 1, name: "Analytical", description: "Drawn to problem-solving, data, and structured learning environments." },
    { type: 2, name: "Athletic", description: "Focuses on physical activity, fitness goals, and structured routines." },
    { type: 3, name: "Creative", description: "Prefers self-expression, design, or imaginative work across mediums." },
    { type: 4, name: "Practical", description: "Values hands-on tasks, trade skills, and functional outcomes." },
    { type: 5, name: "Academic", description: "Engages deeply with theory, research, and formal education paths." },
    { type: 6, name: "Adventurous", description: "Seeks new experiences, spontaneity, and freedom from routine." },
    { type: 7, name: "Social", description: "Thrives on communication, collaboration, and people-oriented roles." },
    { type: 8, name: "Technical", description: "Enjoys working with systems, machines, or programming logic." },
    { type: 9, name: "Reflective", description: "Leans toward introspection, philosophy, or solo academic pursuits." }
];

const stats = ["str", "int", "wil", "dex", "cha", "con"];

// --- PERSONA-BASED DIFFICULTY MODIFIERS ---
// This is the core logic for varying difficulty.
// A negative value makes the task easier (lower 'value' score).
// A positive value makes the task harder (higher 'value' score).
const statAffinities = {
  str: { Analytical: 0.1, Athletic: -0.4, Creative: 0.15, Practical: -0.2, Academic: 0.3, Adventurous: -0.1, Social: 0.2, Technical: 0.0, Reflective: 0.35 },
  int: { Analytical: -0.4, Athletic: 0.3, Creative: -0.1, Practical: 0.1, Academic: -0.3, Adventurous: 0.2, Social: -0.05, Technical: -0.25, Reflective: -0.15 },
  wil: { Analytical: -0.1, Athletic: -0.2, Creative: 0.2, Practical: -0.1, Academic: -0.15, Adventurous: 0.3, Social: 0.1, Technical: 0.0, Reflective: -0.3 },
  dex: { Analytical: 0.2, Athletic: -0.3, Creative: -0.25, Practical: -0.2, Academic: 0.35, Adventurous: -0.1, Social: 0.05, Technical: -0.15, Reflective: 0.3 },
  cha: { Analytical: 0.25, Athletic: 0.1, Creative: -0.1, Practical: 0.0, Academic: 0.2, Adventurous: -0.2, Social: -0.4, Technical: 0.35, Reflective: 0.3 },
  con: { Analytical: 0.15, Athletic: -0.4, Creative: 0.2, Practical: -0.15, Academic: 0.3, Adventurous: -0.25, Social: 0.0, Technical: 0.1, Reflective: 0.25 }
};

// --- HELPER FUNCTIONS ---

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Calculates the final difficulty value based on the base value and persona type.
 * @param {number} baseValue - The neutral difficulty (1-750).
 * @param {string} stat - The stat being tested (e.g., 'str').
 * @param {object} type - The persona type object.
 * @returns {number} - The adjusted value, clamped between 1 and 750.
 */
function calculateValue(baseValue, stat, type) {
  const modifier = statAffinities[stat][type.name] || 0;
  const adjustedValue = baseValue + (baseValue * modifier);
  return Math.max(1, Math.min(750, Math.round(adjustedValue)));
}

/**
 * Calls the Gemini API to get a batch of new, unique clauses.
 * @param {string} stat - The stat to generate clauses for.
 * @param {Set<string>} existingLabels - A set of already generated labels to avoid duplication.
 * @returns {Promise<Array<{label: string, baseValue: number}>>}
 */
async function generateClauses(stat, existingLabels) {
  const statMap = {
    str: "Strength (physical power, lifting, endurance)",
    int: "Intelligence (logic, memory, problem-solving)",
    wis: "Wisdom (discipline, focus, planning, willpower)",
    dex: "Dexterity (coordination, fine motor skills, agility)",
    cha: "Charisma (persuasion, social interaction, leadership)",
    con: "Constitution (health, resilience to sickness/poison, stamina)"
  };
  
  const examplesToAvoid = Array.from(existingLabels).slice(-20).join('", "');

  const prompt = `
    You are a data generator for a game. Your task is to generate a JSON array of objects.
    Each object must have two keys: "label" (a string) and "baseValue" (an integer between 1 and 750).
    The "label" must be clauses based everyday task, accomplishments, extersizes or goals, completed in the past tense, phrased like someone would say as part of a greater description, and has complexities like time taken, related to the stat: ${statMap[stat]}.Make sure its written casually.
    The "baseValue" should represent the general, neutral difficulty of the task.
    Generate exactly ${BATCH_SIZE} unique examples.

    Do NOT repeat any of the following examples: "${examplesToAvoid}"

    Your output MUST be a single, valid JSON array of objects and nothing else.
  `;
  
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean the response to ensure it's valid JSON
      const cleanText = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const clauses = JSON.parse(cleanText);
      
      if (Array.isArray(clauses)) {
        return clauses.filter(c => c.label && typeof c.baseValue === 'number');
      }
    } catch (error) {
      console.error(`API call or parsing failed on attempt ${attempts + 1}. Retrying...`, error.message);
      attempts++;
      // Wait for a second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.error(`Failed to generate clauses for stat '${stat}' after 3 attempts.`);
  return []; // Return empty array on failure
}

// --- MAIN EXECUTION ---

async function main() {
  console.log("Starting data generation process...");
  const trainingData = [];
  const generatedLabels = new Set();
  
  while (trainingData.length < TARGET_DATA_POINTS) {
    // Select a random stat for this batch
    const currentStat = stats[Math.floor(Math.random() * stats.length)];
    
    console.log(`\nGenerating a new batch for stat: '${currentStat.toUpperCase()}'...`);
    
    const newClauses = await generateClauses(currentStat, generatedLabels);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (newClauses.length === 0) {
        console.log("Received empty batch, continuing to next stat.");
        continue;
    }

    let addedCount = 0;
    for (const clause of newClauses) {
      if (!generatedLabels.has(clause.label)) {
        generatedLabels.add(clause.label);
        
        for (const type of typeList) {
          const finalValue = calculateValue(clause.baseValue, currentStat, type);
          trainingData.push({
            type: type.type,
            label: clause.label,
            value: finalValue,
            stat: currentStat
          });
        }
        addedCount++;
      }
    }
    
    console.log(`Added ${addedCount} new unique clauses.`);
    console.log(`Total data points: ${trainingData.length} / ${TARGET_DATA_POINTS}`);
  }
  
  console.log(`\nTarget of ${TARGET_DATA_POINTS} reached!`);
  console.log(`Writing data to ${OUTPUT_FILENAME}...`);
  
  fs.writeFileSync(OUTPUT_FILENAME, JSON.stringify(trainingData, null, 2));
  
  console.log("Data generation complete!");
  console.log(`Total unique phrases generated: ${generatedLabels.size}`);
}

main().catch(console.error);
