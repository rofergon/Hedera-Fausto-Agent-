// logger.js - Logging utility for Hedera Fausto Agent
// Provides formatted, level-based logging with the ability to filter verbose output

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Default configuration
let config = {
  level: LOG_LEVELS.INFO,
  showTimestamp: true,
  showModule: true,
  compactMode: false,
  // Modules to filter out completely (even at high log levels)
  filteredModules: [],
  // Special handling for verbose modules - only show important logs
  verboseModules: ['HCS-11', 'ConnectionTool']
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

// Save original console methods for direct access
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

// Timestamp formatter
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().slice(11, 19); // HH:MM:SS
};

// Formatter function
const formatLog = (level, module, message) => {
  let result = '';
  
  // Timestamp part
  if (config.showTimestamp) {
    result += `${colors.gray}[${getTimestamp()}]${colors.reset} `;
  }
  
  // Level part with color
  switch (level) {
    case 'ERROR':
      result += `${colors.red}[${level}]${colors.reset} `;
      break;
    case 'WARN':
      result += `${colors.yellow}[${level}]${colors.reset} `;
      break;
    case 'INFO':
      result += `${colors.green}[${level}]${colors.reset} `;
      break;
    case 'DEBUG':
      result += `${colors.blue}[${level}]${colors.reset} `;
      break;
    case 'TRACE':
      result += `${colors.gray}[${level}]${colors.reset} `;
      break;
    default:
      result += `[${level}] `;
  }
  
  // Module part
  if (config.showModule && module) {
    result += `${colors.cyan}[${module}]${colors.reset} `;
  }
  
  // Message part
  result += message;
  
  return result;
};

// Should this log be displayed based on current settings?
const shouldLog = (levelName, module) => {
  // Get numeric level
  const level = LOG_LEVELS[levelName];
  
  // Filter by level
  if (level > config.level) {
    return false;
  }
  
  // Filter by module filters
  if (config.filteredModules.includes(module)) {
    return false;
  }
  
  // Special handling for verbose modules
  if (config.verboseModules.includes(module) && level >= LOG_LEVELS.DEBUG) {
    return false; // Filter debug/trace logs from verbose modules
  }
  
  return true;
};

// Main logging methods
const logger = {
  error: (message, module) => {
    if (shouldLog('ERROR', module)) {
      originalConsole.error(formatLog('ERROR', module, message));
    }
  },
  
  warn: (message, module) => {
    if (shouldLog('WARN', module)) {
      originalConsole.warn(formatLog('WARN', module, message));
    }
  },
  
  info: (message, module) => {
    if (shouldLog('INFO', module)) {
      originalConsole.log(formatLog('INFO', module, message));
    }
  },
  
  debug: (message, module) => {
    if (shouldLog('DEBUG', module)) {
      originalConsole.log(formatLog('DEBUG', module, message));
    }
  },
  
  trace: (message, module) => {
    if (shouldLog('TRACE', module)) {
      originalConsole.log(formatLog('TRACE', module, message));
    }
  },
  
  // Specialized method for search results
  searchResults: (results, query) => {
    if (!results || !Array.isArray(results)) {
      logger.info(`No results found for query: ${query}`, 'Search');
      return;
    }
    
    logger.info(`Found ${results.length} agents matching "${query}":`, 'Search');
    
    // Create a compact, table-like display for search results
    if (results.length > 0) {
      originalConsole.log('\n' + colors.bold + '=== AGENT SEARCH RESULTS ===' + colors.reset);
      
      results.forEach((agent, index) => {
        originalConsole.log(`${colors.bold}${index + 1}. ${agent.name || 'Unnamed Agent'} ${colors.cyan}(${agent.accountId})${colors.reset}`);
        
        if (agent.description) {
          originalConsole.log(`   ${agent.description.substring(0, 60)}${agent.description.length > 60 ? '...' : ''}`);
        }
        
        if (agent.type || agent.capabilities) {
          let details = [];
          if (agent.type) details.push(`Type: ${agent.type}`);
          if (agent.capabilities && agent.capabilities.length) {
            details.push(`Capabilities: ${agent.capabilities.join(', ')}`);
          }
          originalConsole.log(`   ${colors.gray}${details.join(' | ')}${colors.reset}`);
        }
      });
      
      originalConsole.log(colors.bold + '===========================' + colors.reset + '\n');
    }
  },
  
  // Configuration method
  configure: (options) => {
    config = { ...config, ...options };
    
    // Convert level name to numeric value if provided as string
    if (typeof config.level === 'string') {
      config.level = LOG_LEVELS[config.level.toUpperCase()] || config.level;
    }
    
    return config;
  },
  
  // Get current configuration
  getConfig: () => ({ ...config }),
  
  // Log levels for reference
  levels: LOG_LEVELS
};

export default logger; 