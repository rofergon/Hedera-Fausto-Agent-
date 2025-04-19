// console-patch.js
// Utility to intercept console.log messages from external libraries
// and redirect them through our logger with proper formatting

import logger from './logger.js';

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Module detection patterns (for auto-detecting which module is logging)
const modulePatterns = [
  // Format: [regex pattern, module name]
  [/\{\s*module:\s*'([^']+)'\s*\}/, '$1'],  // { module: 'ModuleName' }
  [/HCS-\d+/, 'HCS'],                        // HCS-10, HCS-11, etc.
  [/ConnectionTool/, 'Connection'],          // ConnectionTool mentions
  [/Monitoring/, 'Monitor'],                 // Monitor-related logs
  [/connection request/i, 'Connection'],     // Connection requests
  [/profile/i, 'Profile'],                   // Profile-related logs
  [/topic/i, 'Topic'],                       // Topic-related logs
];

// Filter patterns - messages to completely ignore
const filterPatterns = [
  /^Running \S+ with args/,                  // LangChain tool execution notices
  /^Got output/,                             // LangChain output notices
  /^{}\s*$/,                                 // Empty object logs
  /^\[chain\/start\]/,                       // LangChain chain start notices
  /^\[chain\/end\]/,                         // LangChain chain end notices
  /^\[llm\/start\]/,                         // LangChain LLM start notices 
  /^\[llm\/end\]/,                           // LangChain LLM end notices
];

/**
 * Tries to extract a module name from a message based on patterns
 */
function detectModule(message) {
  if (!message || typeof message !== 'string') return null;
  
  for (const [pattern, moduleName] of modulePatterns) {
    const match = message.match(pattern);
    if (match) {
      // If moduleName is a reference to a capture group, use the captured value
      return moduleName.startsWith('$') 
        ? match[parseInt(moduleName.slice(1))]
        : moduleName;
    }
  }
  
  return null;
}

/**
 * Determines if a message should be filtered out completely
 */
function shouldFilter(message) {
  if (!message || typeof message !== 'string') return false;
  
  // Filter LangChain verbose logs unless explicitly enabled
  if (process.env.VERBOSE_DEBUG !== 'true') {
    if (message.includes('[chain:') || 
        message.includes('[llm:') ||
        message.includes('Entering Chain run') ||
        message.includes('Exiting Chain run')) {
      return true;
    }
  }
  
  return filterPatterns.some(pattern => pattern.test(message));
}

/**
 * Clean a message by removing noise and unnecessary patterns
 */
function cleanMessage(message) {
  if (!message || typeof message !== 'string') return message;
  
  // Remove { module: 'ModuleName' } prefixes
  message = message.replace(/\{\s*module:\s*'[^']+'\s*\}\s*/, '');
  
  return message.trim();
}

/**
 * Apply the console patch, redirecting all console output through our logger
 */
function applyConsolePatch() {
  console.log = function(...args) {
    // Convert all arguments to strings for processing
    const messages = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    );
    
    // Join all arguments into a single message
    const fullMessage = messages.join(' ');
    
    // Skip if message matches filter patterns
    if (shouldFilter(fullMessage)) return;
    
    // Try to detect which module this log is from
    const detectedModule = detectModule(fullMessage);
    
    // Clean the message
    const cleanedMessage = cleanMessage(fullMessage);
    
    // Log using our custom logger
    if (detectedModule) {
      // Use direct formatting to avoid recursion
      const formattedMessage = `[${new Date().toISOString().slice(11, 19)}] [INFO] [${detectedModule}] ${cleanedMessage}`;
      originalConsole.log(formattedMessage);
    } else {
      // If no module detected, pass through to original console
      originalConsole.log(...args);
    }
  };
  
  console.error = function(...args) {
    const messages = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    );
    const fullMessage = messages.join(' ');
    
    if (shouldFilter(fullMessage)) return;
    
    const detectedModule = detectModule(fullMessage);
    const cleanedMessage = cleanMessage(fullMessage);
    
    if (detectedModule) {
      // Use direct formatting to avoid recursion
      const formattedMessage = `[${new Date().toISOString().slice(11, 19)}] [ERROR] [${detectedModule}] ${cleanedMessage}`;
      originalConsole.error(formattedMessage);
    } else {
      originalConsole.error(...args);
    }
  };
  
  console.warn = function(...args) {
    const messages = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    );
    const fullMessage = messages.join(' ');
    
    if (shouldFilter(fullMessage)) return;
    
    const detectedModule = detectModule(fullMessage);
    const cleanedMessage = cleanMessage(fullMessage);
    
    if (detectedModule) {
      // Use direct formatting to avoid recursion
      const formattedMessage = `[${new Date().toISOString().slice(11, 19)}] [WARN] [${detectedModule}] ${cleanedMessage}`;
      originalConsole.warn(formattedMessage);
    } else {
      originalConsole.warn(...args);
    }
  };
  
  originalConsole.log('Console patched to redirect library logs through custom logger');
  return originalConsole;
}

/**
 * Restore original console methods
 */
function restoreConsole() {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  
  originalConsole.log('Original console methods restored');
}

export {
  applyConsolePatch,
  restoreConsole
}; 