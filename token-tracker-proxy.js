const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================
const TARGET_HOST = 'integrate.api.nvidia.com';
const TARGET_PATH = '/v1/chat/completions';
const PROXY_PORT = 3456;
const LOG_FILE = path.join(__dirname, 'token-usage.json');
const LOG_FILE_CSV = path.join(__dirname, 'token-usage.csv');

// Store token usage data
let usageStats = {
  sessions: [],
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  requestCount: 0
};

// ============================================
// LOAD PREVIOUS STATS IF EXISTS
// ============================================
if (fs.existsSync(LOG_FILE)) {
  try {
    const savedStats = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    usageStats = savedStats;
    console.log('📂 Loaded previous usage statistics');
  } catch (e) {
    console.log('⚠️ Could not load previous stats, starting fresh');
  }
}

// ============================================
// SAVE STATS TO FILE
// ============================================
function saveStats(response, modelName) {
  const usage = response.usage;
  
  usageStats.requestCount++;
  usageStats.totalPromptTokens += usage.prompt_tokens;
  usageStats.totalCompletionTokens += usage.completion_tokens;
  usageStats.totalTokens += usage.total_tokens;
  
  const session = {
    timestamp: new Date().toISOString(),
    model: modelName || response.model || 'unknown',
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    requestNumber: usageStats.requestCount
  };
  
  usageStats.sessions.push(session);
  
  // Keep only last 1000 sessions to avoid huge file
  if (usageStats.sessions.length > 1000) {
    usageStats.sessions = usageStats.sessions.slice(-500);
  }
  
  // Save JSON
  fs.writeFileSync(LOG_FILE, JSON.stringify(usageStats, null, 2));
  
  // Append to CSV
  const csvLine = `"${session.timestamp}","${session.model}",${session.promptTokens},${session.completionTokens},${session.totalTokens}\n`;
  if (!fs.existsSync(LOG_FILE_CSV)) {
    fs.writeFileSync(LOG_FILE_CSV, 'Timestamp,Model,Prompt Tokens,Completion Tokens,Total Tokens\n');
  }
  fs.appendFileSync(LOG_FILE_CSV, csvLine);
  
  return session;
}

// ============================================
// PRETTY PRINT TOKEN USAGE
// ============================================
function logTokenUsage(session, estimatedCost) {
  const border = '═══════════════════════════════════';
  console.log('');
  console.log(border);
  console.log('  📊  TOKEN USAGE REPORT');
  console.log(border);
  console.log(`  🕒  Time:        ${new Date(session.timestamp).toLocaleString()}`);
  console.log(`  🤖  Model:       ${session.model}`);
  console.log(`  🔢  Request #:   ${session.requestNumber}`);
  console.log(`  ────────────────────────────────`);
  console.log(`  📥  Prompt:      ${session.promptTokens.toLocaleString()} tokens`);
  console.log(`  📤  Completion:  ${session.completionTokens.toLocaleString()} tokens`);
  console.log(`  📊  Total:       ${session.totalTokens.toLocaleString()} tokens`);
  
  if (estimatedCost) {
    console.log(`  ────────────────────────────────`);
    console.log(`  💰  Est. Cost:   $${estimatedCost.toFixed(6)}`);
  }
  
  console.log(`  ────────────────────────────────`);
  console.log(`  📈  All-Time Stats:`);
  console.log(`       Requests:   ${usageStats.requestCount.toLocaleString()}`);
  console.log(`       Total Tokens: ${usageStats.totalTokens.toLocaleString()}`);
  console.log(border);
  console.log('');
}

// ============================================
// ESTIMATE COST (approximate - update with actual NVIDIA pricing)
// ============================================
function estimateCost(model, promptTokens, completionTokens) {
  // Approximate pricing per 1M tokens (UPDATE THESE WITH ACTUAL PRICES)
  const pricing = {
    'deepseek-ai/deepseek-v4-pro': { input: 2.50, output: 8.00 },
    'deepseek-ai/deepseek-v4-flash': { input: 0.27, output: 1.10 },
    'nvidia/nemotron-3-ultra-550b-a55b': { input: 1.00, output: 4.00 },
    'moonshotai/kimi-k2.6': { input: 0.60, output: 2.40 },
    'default': { input: 1.00, output: 4.00 }
  };
  
  const price = pricing[model] || pricing['default'];
  const cost = (promptTokens / 1000000 * price.input) + 
               (completionTokens / 1000000 * price.output);
  return cost;
}

// ============================================
// PROXY SERVER
// ============================================
const server = http.createServer((req, res) => {
  // Only proxy chat completions
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Only POST requests are supported' }));
    return;
  }
  
  const chunks = [];
  
  req.on('data', (chunk) => chunks.push(chunk));
  
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    let modelName = 'unknown';
    
    // Extract model name from request
    try {
      const requestBody = JSON.parse(body);
      modelName = requestBody.model || 'unknown';
    } catch (e) {
      // Can't parse body, continue anyway
    }
    
    // Track token usage for this request
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let finalModel = modelName;
    
    console.log(`\n🔄 Request to model: ${modelName}`);
    
    // Forward request to NVIDIA API
    const options = {
      hostname: TARGET_HOST,
      path: TARGET_PATH,
      method: 'POST',
      headers: {
        ...req.headers,
        host: TARGET_HOST
      }
    };
    
    const proxyReq = https.request(options, (proxyRes) => {
      let responseChunks = [];
      
      proxyRes.on('data', (chunk) => {
        responseChunks.push(chunk);
        
        // If streaming, forward chunks immediately and check for usage info
        if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
          res.write(chunk);
          
          const chunkStr = chunk.toString();
          // Try to extract usage from streaming chunks
          try {
            const lines = chunkStr.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                if (jsonStr === '[DONE]') continue;
                const data = JSON.parse(jsonStr);
                if (data.usage) {
                  totalPromptTokens += data.usage.prompt_tokens || 0;
                  totalCompletionTokens += data.usage.completion_tokens || 0;
                  totalTokens += data.usage.total_tokens || 0;
                  if (data.model) finalModel = data.model;
                }
              }
            }
          } catch (e) {
            // Ignore parse errors for individual chunks
          }
        }
      });
      
      proxyRes.on('end', () => {
        // For non-streaming responses
        if (!proxyRes.headers['content-type']?.includes('text/event-stream')) {
          const responseBody = Buffer.concat(responseChunks).toString();
          
          try {
            const response = JSON.parse(responseBody);
            if (response.usage) {
              finalModel = response.model || modelName;
              const session = saveStats(response, finalModel);
              const cost = estimateCost(finalModel, response.usage.prompt_tokens, response.usage.completion_tokens);
              logTokenUsage(session, cost);
            } else if (response.error) {
              console.log(`\n❌ API Error: ${response.error.message || JSON.stringify(response.error)}`);
            }
          } catch (e) {
            console.log(`\n⚠️ Could not parse response: ${e.message}`);
          }
          
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          res.end(responseBody);
        } else {
          // For streaming responses, save stats if we got usage info
          if (totalTokens > 0) {
            const usage = {
              usage: {
                prompt_tokens: totalPromptTokens,
                completion_tokens: totalCompletionTokens,
                total_tokens: totalTokens
              },
              model: finalModel
            };
            const session = saveStats(usage, finalModel);
            const cost = estimateCost(finalModel, totalPromptTokens, totalCompletionTokens);
            logTokenUsage(session, cost);
          } else {
            console.log('⚠️ No token usage info found in streaming response');
          }
          
          res.end();
        }
      });
      
      proxyRes.on('error', (err) => {
        console.error(`\n❌ Response Error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy response error', message: err.message }));
        }
      });
    });
    
    proxyReq.on('error', (err) => {
      console.error(`\n❌ Request Error: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy request error', message: err.message }));
      }
    });
    
    proxyReq.write(body);
    proxyReq.end();
  });
  
  req.on('error', (err) => {
    console.error(`\n❌ Client Error: ${err.message}`);
  });
});

// ============================================
// START SERVER
// ============================================
server.listen(PROXY_PORT, () => {
  const border = '═══════════════════════════════════';
  console.log('');
  console.log(border);
  console.log('  🚀  TOKEN TRACKER PROXY IS RUNNING');
  console.log(border);
  console.log(`  📡  Proxy URL:  http://localhost:${PROXY_PORT}`);
  console.log(`  🎯  Target:     ${TARGET_HOST}`);
  console.log(`  📝  Logs:       ${LOG_FILE}`);
  console.log(`  📊  CSV:        ${LOG_FILE_CSV}`);
  console.log(border);
  console.log('');
  console.log('  ⚙️  Update your Continue config.yaml:');
  console.log(`     apiBase: http://localhost:${PROXY_PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop the proxy');
  console.log(border);
  console.log('');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down proxy server...');
  console.log(`📊 Total requests tracked: ${usageStats.requestCount}`);
  console.log(`📊 Total tokens used: ${usageStats.totalTokens.toLocaleString()}`);
  server.close();
  process.exit(0);
});