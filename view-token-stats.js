const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'token-usage.json');

if (!fs.existsSync(LOG_FILE)) {
  console.log('\n📭 No token usage data found yet. Make some API calls first!\n');
  process.exit(0);
}

const stats = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));

const border = '═══════════════════════════════════';
console.log('');
console.log(border);
console.log('  📊  TOKEN USAGE DASHBOARD');
console.log(border);
console.log(`  🔢  Total Requests:     ${stats.requestCount.toLocaleString()}`);
console.log(`  📥  Total Prompt Tokens:    ${stats.totalPromptTokens.toLocaleString()}`);
console.log(`  📤  Total Completion Tokens: ${stats.totalCompletionTokens.toLocaleString()}`);
console.log(`  📊  Total All Tokens:       ${stats.totalTokens.toLocaleString()}`);
console.log(`  ────────────────────────────────`);

// Group by model
const modelStats = {};
stats.sessions.forEach(session => {
  if (!modelStats[session.model]) {
    modelStats[session.model] = {
      count: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
  }
  modelStats[session.model].count++;
  modelStats[session.model].promptTokens += session.promptTokens;
  modelStats[session.model].completionTokens += session.completionTokens;
  modelStats[session.model].totalTokens += session.totalTokens;
});

console.log('  Breakdown by Model:');
console.log('');
Object.entries(modelStats).forEach(([model, data]) => {
  console.log(`  🤖 ${model}`);
  console.log(`     Requests: ${data.count}`);
  console.log(`     Prompt: ${data.promptTokens.toLocaleString()} tokens`);
  console.log(`     Completion: ${data.completionTokens.toLocaleString()} tokens`);
  console.log(`     Total: ${data.totalTokens.toLocaleString()} tokens`);
  console.log('');
});

// Last 5 requests
console.log('  ────────────────────────────────');
console.log('  📋  Last 5 Requests:');
console.log('');
stats.sessions.slice(-5).reverse().forEach(session => {
  console.log(`  🕒  ${new Date(session.timestamp).toLocaleString()}`);
  console.log(`     Model: ${session.model}`);
  console.log(`     Tokens: ${session.totalTokens.toLocaleString()}`);
  console.log('');
});

console.log(border);
console.log('');
