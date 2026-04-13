// Analytics and ML Configuration for ChronoBank

export const ANALYTICS_CONFIG = {
  // Pattern Detection Settings
  PATTERN_DETECTION: {
    MIN_DATA_POINTS: 10, // Minimum transactions needed for pattern detection
    CONFIDENCE_THRESHOLD: 0.7, // Minimum confidence to consider a pattern valid
    SEASONALITY_THRESHOLD: 0.3, // Variance threshold for seasonal pattern detection
    ANOMALY_Z_SCORE_THRESHOLD: 2.5, // Z-score threshold for anomaly detection
    LOOKBACK_DAYS: 365, // Default lookback period for analysis
  },

  // Forecasting Settings
  FORECASTING: {
    DEFAULT_FORECAST_DAYS: 90,
    MAX_FORECAST_DAYS: 365,
    MIN_CONFIDENCE: 0.5, // Minimum confidence for forecast display
    CASH_FLOW_VOLATILITY_THRESHOLD: 0.4, // Threshold for high volatility warning
    TREND_DETECTION_WINDOW: 30, // Days for trend analysis
  },

  // Scenario Simulation Settings
  SIMULATION: {
    DEFAULT_PROJECTION_DAYS: 90,
    RISK_THRESHOLDS: {
      LOW: 0.3,
      MEDIUM: 0.5,
      HIGH: 0.7,
      CRITICAL: 0.9,
    },
    CURRENCY_IMPACT_FACTORS: {
      DEPRECIATION_PASS_THROUGH: 0.3, // How much currency depreciation affects expenses
      INFLATION_PASS_THROUGH: 0.5, // How much inflation affects expenses
    },
  },

  // Ghanaian Market Specifics
  GHANAIAN_MARKET: {
    CURRENCY: 'GHS',
    INFORMAL_SECTOR_THRESHOLD: 0.5, // Coefficient of variation for irregular income detection
    PAYDAY_PERIODS: {
      START_DAY: 25,
      END_DAY: 5,
    },
    SEASONAL_FESTIVALS: {
      DECEMBER: ['Christmas', 'Year-end'],
      APRIL: ['Easter'],
      AUGUST: ['Homowo'],
      NOVEMBER: ['Farmers Day'],
    },
    TYPICAL_EXPENSE_CATEGORIES: [
      'Transportation',
      'Food',
      'Utilities',
      'Rent',
      'Healthcare',
      'Education',
      'Communication',
      'Entertainment',
      'Clothing',
      'Family Support',
    ],
  },

  // Rule Engine Settings
  RULE_ENGINE: {
    MAX_RULES_PER_USER: 50,
    EXECUTION_TIMEOUT: 30000, // 30 seconds in milliseconds
    SCHEDULED_RULE_CHECK_INTERVAL: 60000, // 1 minute in milliseconds
    PRIORITY_LEVELS: 10,
    DEFAULT_PRIORITY: 5,
  },

  // Data Processing Settings
  DATA_PROCESSING: {
    BATCH_SIZE: 1000, // Number of records to process at once
    MAX_TRANSACTIONS_FOR_ANALYSIS: 10000,
    CACHE_DURATION: 300000, // 5 minutes in milliseconds
    CLEANUP_INTERVAL: 86400000, // 24 hours in milliseconds
  },

  // ML Model Settings
  ML_MODELS: {
    RETRAINING_INTERVAL: 604800000, // 7 days in milliseconds
    MODEL_ACCURACY_THRESHOLD: 0.8,
    FEATURE_ENGINEERING: {
      INCLUDE_TIME_FEATURES: true,
      INCLUDE_SEASONAL_FEATURES: true,
      INCLUDE_CATEGORY_FEATURES: true,
      INCLUDE_AMOUNT_FEATURES: true,
    },
  },
};

// Feature flags for experimental features
export const FEATURE_FLAGS = {
  ADVANCED_ML_PREDICTIONS: true,
  REAL_TIME_ANOMALY_DETECTION: true,
  CURRENCY_HEDGING_SIMULATION: false, // Experimental
  SOCIAL_SPENDING_PATTERNS: false, // Future feature
  VOICE_ASSISTANT_INTEGRATION: false, // Future feature
};

// Error messages and user-friendly text
export const MESSAGES = {
  INSUFFICIENT_DATA: 'Not enough transaction data for accurate analysis. Continue using the app to improve predictions.',
  PATTERN_NOT_FOUND: 'No clear spending patterns detected in your data.',
  HIGH_VOLATILITY: 'Your spending shows high volatility. Consider budgeting for better financial stability.',
  CASH_FLOW_WARNING: 'Potential cash flow issues detected. Review your spending and consider running scenarios.',
  CURRENCY_RISK: 'Currency depreciation risk detected. Consider diversifying your currency holdings.',
  RULE_EXECUTION_SUCCESS: 'Financial rule executed successfully.',
  RULE_EXECUTION_FAILED: 'Failed to execute financial rule. Please check your account balance.',
};

// Validation schemas
export const VALIDATION_RULES = {
  RULE_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
    PATTERN: /^[a-zA-Z0-9\s\-_]+$/,
  },
  TRANSACTION_AMOUNT: {
    MIN: 0.01,
    MAX: 1000000, // 1 million GHS
  },
  FORECAST_DAYS: {
    MIN: 1,
    MAX: 365,
  },
  SCENARIO_PARAMETERS: {
    INCOME_CHANGE: { MIN: -100, MAX: 100 },
    EXPENSE_CHANGE: { MIN: -100, MAX: 100 },
    CURRENCY_DEPRECIATION: { MIN: 0, MAX: 100 },
    INFLATION_RATE: { MIN: 0, MAX: 100 },
  },
};

// Export configuration for easy access
export default ANALYTICS_CONFIG;
