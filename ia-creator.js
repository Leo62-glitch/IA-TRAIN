class SimpleAI {
  constructor(name, personality) {
    this.name = name;
    this.personality = personality;
    this.trainingData = new Map();
    this.model = null;
    this.vocabulary = new Set();
    this.encodedResponses = new Map();
  }

  // Méthode pour sérialiser l'IA
  toJSON() {
    return {
      name: this.name,
      personality: this.personality,
      trainingData: Array.from(this.trainingData.entries()),
      vocabulary: Array.from(this.vocabulary)
    };
  }

  // Méthode pour charger une IA depuis les données sauvegardées
  static fromJSON(data) {
    const ai = new SimpleAI(data.name, data.personality);
    data.trainingData.forEach(([input, output]) => ai.addTrainingPair(input, output));
    return ai;
  }

  addTrainingPair(input, output) {
    this.trainingData.set(input.toLowerCase(), output);
    input.toLowerCase().split(' ').forEach(word => this.vocabulary.add(word));
  }

  encodeText(text) {
    const words = Array.from(this.vocabulary);
    const encoding = new Array(words.length).fill(0);
    
    text.toLowerCase().split(' ').forEach(word => {
      const index = words.indexOf(word);
      if (index !== -1) {
        encoding[index] = 1;
      }
    });
    
    return encoding;
  }

  // Calcul de la distance de Levenshtein entre deux mots
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1,
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1
          );
        }
      }
    }
    return dp[m][n];
  }

  // Calcul de similarité entre deux mots
  wordSimilarity(word1, word2) {
    const maxLength = Math.max(word1.length, word2.length);
    const distance = this.levenshteinDistance(word1, word2);
    return 1 - (distance / maxLength);
  }

  // Trouve le meilleur mot correspondant dans le vocabulaire
  findBestWordMatch(word, threshold = 0.7) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (let vocabWord of this.vocabulary) {
      const similarity = this.wordSimilarity(word.toLowerCase(), vocabWord.toLowerCase());
      if (similarity > bestScore && similarity >= threshold) {
        bestScore = similarity;
        bestMatch = vocabWord;
      }
    }
    
    return bestMatch || word;
  }

  similarity(str1, str2) {
    // Convert both strings to lowercase for case-insensitive comparison
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    // If the strings are identical, return 1
    if (str1 === str2) return 1.0;
    
    // If either string is empty, return 0
    if (str1.length === 0 || str2.length === 0) return 0.0;
    
    // Use Levenshtein distance for similarity calculation
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    // Return similarity score between 0 and 1
    return 1 - (distance / maxLength);
  }

  findBestMatch(input) {
    let bestMatch = '';
    let highestScore = 0;
    
    const inputWords = input.toLowerCase().split(' ');
    const correctedInputWords = inputWords.map(word => this.findBestWordMatch(word));
    
    for (let [trainInput] of this.trainingData) {
      const trainWords = trainInput.toLowerCase().split(' ');
      let score = 0;
      let matchedWords = 0;
      
      for (let word of correctedInputWords) {
        const wordScores = trainWords.map(trainWord => 
          this.similarity(word, trainWord)
        );
        const bestWordScore = Math.max(...wordScores);
        if (bestWordScore > 0.7) {
          score += bestWordScore;
          matchedWords++;
        }
      }
      
      // Normalisation du score
      score = (score / correctedInputWords.length) * 
              (matchedWords / Math.max(correctedInputWords.length, trainWords.length));
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = trainInput;
      }
    }
    
    return highestScore > 0.3 ? this.trainingData.get(bestMatch) : 
      "Je ne suis pas sûr de comprendre. Pouvez-vous reformuler?";
  }

  async train() {
    // Simulation d'entraînement
    return new Promise(resolve => {
      setTimeout(() => {
        console.log("Entraînement terminé!");
        resolve();
      }, 1000);
    });
  }

  generateResponse(input) {
    return this.findBestMatch(input);
  }

  generateShareCode() {
    const data = this.toJSON();
    return btoa(JSON.stringify(data));
  }

  static fromShareCode(shareCode) {
    try {
      const data = JSON.parse(atob(shareCode));
      return SimpleAI.fromJSON(data);
    } catch (error) {
      console.error('Invalid share code:', error);
      return null;
    }
  }
}

// Interface UI
let ai = null;
let userId = null;

// Générer ou récupérer un ID utilisateur unique
function getUserId() {
  let id = localStorage.getItem('userId');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', id);
  }
  return id;
}

// Initialize user ID
userId = getUserId();

function getSaveKey() {
  return `savedAI_${userId}`;
}

function addMessage(message, isUser = true) {
  const chatbox = document.getElementById('chatbox');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
  messageDiv.textContent = message;
  chatbox.appendChild(messageDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
}

document.getElementById('trainAI').addEventListener('click', async () => {
  const name = document.getElementById('aiName').value || "Assistant";
  const personality = document.getElementById('aiPersonality').value || "Je suis un assistant IA amical";
  
  ai = new SimpleAI(name, personality);
  
  // Collecter toutes les paires d'entraînement
  document.querySelectorAll('.training-pair').forEach(pair => {
    const input = pair.querySelector('.input').value;
    const output = pair.querySelector('.output').value;
    if (input && output) {
      ai.addTrainingPair(input, output);
    }
  });
  
  await ai.train();
  alert("L'IA a été entraînée avec succès!");
});

document.getElementById('sendMessage').addEventListener('click', () => {
  if (!ai) {
    alert("Veuillez d'abord entraîner l'IA!");
    return;
  }
  
  const input = document.getElementById('userInput');
  const message = input.value.trim();
  
  if (message) {
    addMessage(message, true);
    const response = ai.generateResponse(message);
    addMessage(response, false);
    input.value = '';
  }
});

document.getElementById('addNewPair').addEventListener('click', () => {
  const container = document.querySelector('.training-data');
  const newPair = document.createElement('div');
  newPair.className = 'training-pair';
  newPair.innerHTML = `
    <input type="text" class="input" placeholder="Message utilisateur">
    <input type="text" class="output" placeholder="Réponse souhaitée">
    <button class="add-pair">+</button>
  `;
  container.insertBefore(newPair, document.getElementById('addNewPair'));
});

document.getElementById('userInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('sendMessage').click();
  }
});

// Mise à jour de la fonctionnalité de sauvegarde
document.getElementById('saveAI').addEventListener('click', () => {
  if (!ai) {
    alert("Il n'y a pas d'IA à sauvegarder!");
    return;
  }

  try {
    const aiData = ai.toJSON();
    localStorage.setItem(getSaveKey(), JSON.stringify(aiData));
    alert("L'IA a été sauvegardée avec succès!");
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    alert("Une erreur est survenue lors de la sauvegarde.");
  }
});

// Charger l'IA sauvegardée au démarrage avec l'ID utilisateur
window.addEventListener('DOMContentLoaded', () => {
  const savedAI = localStorage.getItem(getSaveKey());
  if (savedAI) {
    try {
      const aiData = JSON.parse(savedAI);
      ai = SimpleAI.fromJSON(aiData);
      
      // Mettre à jour l'interface
      document.getElementById('aiName').value = ai.name;
      document.getElementById('aiPersonality').value = ai.personality;
      
      // Supprimer la paire d'entraînement par défaut
      document.querySelector('.training-data').innerHTML = `
        <h2>Données d'entraînement</h2>
        <button id="addNewPair" class="button">Ajouter une nouvelle paire</button>
      `;
      
      // Ajouter les paires d'entraînement sauvegardées
      for (let [input, output] of ai.trainingData) {
        const newPair = document.createElement('div');
        newPair.className = 'training-pair';
        newPair.innerHTML = `
          <input type="text" class="input" value="${input}" placeholder="Message utilisateur">
          <input type="text" class="output" value="${output}" placeholder="Réponse souhaitée">
          <button class="add-pair">+</button>
        `;
        document.querySelector('.training-data').insertBefore(
          newPair, 
          document.getElementById('addNewPair')
        );
      }
      
      alert("IA chargée depuis votre sauvegarde personnelle!");
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  }
});

// Add share code functionality
document.getElementById('generateShareCode').addEventListener('click', () => {
  if (!ai) {
    alert("Veuillez d'abord créer une IA!");
    return;
  }
  
  const shareCode = ai.generateShareCode();
  document.getElementById('shareCodeDisplay').value = shareCode;
});

document.getElementById('copyShareCode').addEventListener('click', () => {
  const shareCodeDisplay = document.getElementById('shareCodeDisplay');
  shareCodeDisplay.select();
  document.execCommand('copy');
  alert('Code de partage copié dans le presse-papier!');
});

document.getElementById('importAI').addEventListener('click', () => {
  const importCode = document.getElementById('importCode').value.trim();
  
  if (!importCode) {
    alert('Veuillez entrer un code de partage!');
    return;
  }
  
  try {
    const importedAI = SimpleAI.fromShareCode(importCode);
    if (importedAI) {
      ai = importedAI;
      
      // Update UI with imported AI data
      document.getElementById('aiName').value = ai.name;
      document.getElementById('aiPersonality').value = ai.personality;
      
      // Clear existing training pairs
      document.querySelector('.training-data').innerHTML = `
        <h2>Données d'entraînement</h2>
        <button id="addNewPair" class="button">Ajouter une nouvelle paire</button>
      `;
      
      // Add imported training pairs
      for (let [input, output] of ai.trainingData) {
        const newPair = document.createElement('div');
        newPair.className = 'training-pair';
        newPair.innerHTML = `
          <input type="text" class="input" value="${input}" placeholder="Message utilisateur">
          <input type="text" class="output" value="${output}" placeholder="Réponse souhaitée">
          <button class="add-pair">+</button>
        `;
        document.querySelector('.training-data').insertBefore(
          newPair, 
          document.getElementById('addNewPair')
        );
      }
      
      alert('IA importée avec succès!');
    } else {
      alert('Code de partage invalide!');
    }
  } catch (error) {
    console.error('Error importing AI:', error);
    alert('Erreur lors de l\'importation de l\'IA');
  }
});