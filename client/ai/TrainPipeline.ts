// ============================================================
// TrainPipeline — Automates generation of self-play games and neural network training
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { simulateSelfPlayGame, SelfPlayGame } from './SelfPlay';
import { MLPModel, ModelWeights } from './MLPModel';

const SOURCE_DIR = fs.existsSync(path.join(__dirname, '../../ai/ai-model-weights.json'))
  ? path.join(__dirname, '../../ai')
  : __dirname;

const WEIGHTS_FILE = path.join(SOURCE_DIR, 'ai-model-weights.json');
const DATASET_FILE = path.join(SOURCE_DIR, 'selfplay-dataset.json');

/**
 * Trains the MLP model on a batch of self-play games.
 */
function trainModelOnDataset(
  model: MLPModel,
  games: SelfPlayGame[],
  epochs = 8,
  learningRate = 0.01
) {
  console.log(`Starting training on ${games.length} games...`);

  // Prepare training pairs: (features, target outcome)
  // Win is +1 for AI (whichever player state matches AI), -1 for loss
  interface TrainSample {
    features: number[];
    target: number;
  }

  const dataset: TrainSample[] = [];

  for (const game of games) {
    const winner = game.winner;
    for (const state of game.states) {
      // If the player of this state won, target is +1.0, otherwise -1.0
      const target = state.player === winner ? 1.0 : -1.0;
      dataset.push({
        features: state.features,
        target,
      });
    }
  }

  // Shuffle dataset
  for (let i = dataset.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataset[i], dataset[j]] = [dataset[j], dataset[i]];
  }

  // SGD Training loop
  for (let epoch = 1; epoch <= epochs; epoch++) {
    let totalLoss = 0;
    for (const sample of dataset) {
      const pred = model.forward(sample.features).out;
      const error = pred - sample.target;
      totalLoss += error * error;

      // Single step weight adjustments
      model.trainStep(sample.features, sample.target, learningRate);
    }
    const avgLoss = totalLoss / dataset.length;
    console.log(`Epoch ${epoch}/${epochs} - Learning Rate: ${learningRate} - MSE Loss: ${avgLoss.toFixed(6)}`);
  }

  console.log('Model training complete.');
}

/**
 * Validates the model performance against random decisions.
 */
function validateModel(model: MLPModel, testGamesCount = 100): number {
  let modelWins = 0;
  for (let i = 0; i < testGamesCount; i++) {
    // Model plays as player 1 vs random player 2
    const game = simulateSelfPlayGame(6, 6, 0.1); // low exploration
    if (game.winner === 1) {
      modelWins++;
    }
  }
  return modelWins / testGamesCount;
}

export function runPipeline(gamesToGenerate = 3000, epochs = 10) {
  const model = new MLPModel();

  // Load existing weights if they exist (allows resuming)
  if (fs.existsSync(WEIGHTS_FILE)) {
    console.log('Loading existing model weights for resume...');
    const data = fs.readFileSync(WEIGHTS_FILE, 'utf8');
    model.loadWeights(data);
  }

  let games: SelfPlayGame[] = [];

  // Load dataset if it exists, otherwise generate
  if (fs.existsSync(DATASET_FILE)) {
    console.log('Loading existing dataset...');
    games = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
    console.log(`Loaded ${games.length} games.`);
  }

  const remaining = gamesToGenerate - games.length;
  if (remaining > 0) {
    console.log(`Generating ${remaining} self-play games...`);
    for (let i = 1; i <= remaining; i++) {
      const game = simulateSelfPlayGame(6, 6, 0.25); // exploration to create diversity
      games.push(game);
      if (i % 500 === 0) {
        console.log(`Generated ${i}/${remaining} games...`);
      }
    }
    // Save dataset for consistency
    fs.writeFileSync(DATASET_FILE, JSON.stringify(games, null, 2), 'utf8');
    console.log('Dataset saved to selfplay-dataset.json');
  }

  // Train the model
  trainModelOnDataset(model, games, epochs, 0.005);

  // Validate model
  const winRate = validateModel(model);
  console.log(`Validation Win Rate against Random/Exploratory P2: ${(winRate * 100).toFixed(2)}%`);

  // Save trained weights
  fs.writeFileSync(WEIGHTS_FILE, model.saveWeights(), 'utf8');
  console.log('Final model weights exported to client/ai/ai-model-weights.json');
}

// Ensure the pipeline can be executed as a command-line script
if (require.main === module) {
  const args = process.argv.slice(2);
  const count = args[0] ? parseInt(args[0], 10) : 1000; // default 1000 for faster training run
  const epochs = args[1] ? parseInt(args[1], 10) : 8;
  runPipeline(count, epochs);
}
