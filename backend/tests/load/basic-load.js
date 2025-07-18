/**
 * K6 Load Testing Script for Llama Wool Farm API
 * Tests basic API endpoints under various load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errors = new Counter('errors');
const gameStateUpdates = new Counter('game_state_updates');
const authAttempts = new Counter('auth_attempts');
const successRate = new Rate('success_rate');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 300 },   // Ramp up to 300 users
    { duration: '5m', target: 300 },   // Stay at 300 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // 95% of requests under 500ms
    'http_req_failed': ['rate<0.01'],    // Error rate under 1%
    'success_rate': ['rate>0.99'],       // Success rate over 99%
  },
};

// Test data
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const TEST_USERS = [
  { username: 'testuser1', password: 'password123' },
  { username: 'testuser2', password: 'password123' },
  { username: 'testuser3', password: 'password123' },
];

// Global variables
let authToken = null;
let playerId = null;

export function setup() {
  // Setup test data
  console.log('Setting up load test...');
  
  // Create test users if needed
  for (const user of TEST_USERS) {
    const registerResponse = http.post(`${API_BASE_URL}/api/auth/register`, {
      username: user.username,
      email: `${user.username}@example.com`,
      password: user.password,
    });
    
    if (registerResponse.status === 201 || registerResponse.status === 409) {
      console.log(`User ${user.username} ready for testing`);
    }
  }
  
  return { users: TEST_USERS };
}

export default function(data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  
  // Authentication flow
  authenticateUser(user);
  
  if (authToken) {
    // Game API tests
    testGameEndpoints();
    
    // Player API tests
    testPlayerEndpoints();
    
    // Leaderboard tests
    testLeaderboardEndpoints();
  }
  
  sleep(1);
}

function authenticateUser(user) {
  const loginResponse = http.post(`${API_BASE_URL}/api/auth/login`, {
    username: user.username,
    password: user.password,
  });
  
  authAttempts.add(1);
  
  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time OK': (r) => r.timings.duration < 1000,
  });
  
  successRate.add(success);
  
  if (success) {
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.data.token;
    playerId = loginData.data.player.id;
  } else {
    errors.add(1);
  }
}

function testGameEndpoints() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
  
  // Test game state endpoint
  const gameStateResponse = http.get(`${API_BASE_URL}/api/game/state`, {
    headers,
  });
  
  const gameStateSuccess = check(gameStateResponse, {
    'game state retrieved': (r) => r.status === 200,
    'game state response time OK': (r) => r.timings.duration < 300,
    'game state has data': (r) => {
      const data = JSON.parse(r.body);
      return data.success && data.data;
    },
  });
  
  successRate.add(gameStateSuccess);
  apiResponseTime.add(gameStateResponse.timings.duration);
  
  if (!gameStateSuccess) {
    errors.add(1);
  }
  
  // Test production endpoint
  const productionResponse = http.get(`${API_BASE_URL}/api/game/production`, {
    headers,
  });
  
  const productionSuccess = check(productionResponse, {
    'production retrieved': (r) => r.status === 200,
    'production response time OK': (r) => r.timings.duration < 300,
  });
  
  successRate.add(productionSuccess);
  apiResponseTime.add(productionResponse.timings.duration);
  
  if (!productionSuccess) {
    errors.add(1);
  }
  
  // Test click endpoint
  const clickResponse = http.post(`${API_BASE_URL}/api/game/click`, 
    JSON.stringify({
      x: Math.random() * 800,
      y: Math.random() * 600,
      timestamp: Date.now(),
    }), 
    { headers }
  );
  
  const clickSuccess = check(clickResponse, {
    'click registered': (r) => r.status === 200,
    'click response time OK': (r) => r.timings.duration < 200,
  });
  
  successRate.add(clickSuccess);
  apiResponseTime.add(clickResponse.timings.duration);
  
  if (!clickSuccess) {
    errors.add(1);
  }
  
  // Test buildings endpoint
  const buildingsResponse = http.get(`${API_BASE_URL}/api/game/buildings`, {
    headers,
  });
  
  const buildingsSuccess = check(buildingsResponse, {
    'buildings retrieved': (r) => r.status === 200,
    'buildings response time OK': (r) => r.timings.duration < 300,
  });
  
  successRate.add(buildingsSuccess);
  apiResponseTime.add(buildingsResponse.timings.duration);
  
  if (!buildingsSuccess) {
    errors.add(1);
  }
}

function testPlayerEndpoints() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
  
  // Test player profile
  const profileResponse = http.get(`${API_BASE_URL}/api/players/profile`, {
    headers,
  });
  
  const profileSuccess = check(profileResponse, {
    'profile retrieved': (r) => r.status === 200,
    'profile response time OK': (r) => r.timings.duration < 300,
  });
  
  successRate.add(profileSuccess);
  apiResponseTime.add(profileResponse.timings.duration);
  
  if (!profileSuccess) {
    errors.add(1);
  }
  
  // Test achievements
  const achievementsResponse = http.get(`${API_BASE_URL}/api/players/achievements`, {
    headers,
  });
  
  const achievementsSuccess = check(achievementsResponse, {
    'achievements retrieved': (r) => r.status === 200,
    'achievements response time OK': (r) => r.timings.duration < 300,
  });
  
  successRate.add(achievementsSuccess);
  apiResponseTime.add(achievementsResponse.timings.duration);
  
  if (!achievementsSuccess) {
    errors.add(1);
  }
  
  // Test save game
  const saveResponse = http.post(`${API_BASE_URL}/api/players/save`, 
    JSON.stringify({
      version: '1.0.0',
      timestamp: Date.now(),
      woolCounts: {
        basic: '100',
        silver: '50',
        golden: '25',
        rainbow: '10',
        cosmic: '5',
        ethereal: '2',
        temporal: '1',
        dimensional: '0',
        celestial: '0',
        quantum: '0',
      },
      buildings: {
        barn: { level: 1, unlocked: true },
        shears: { level: 0, unlocked: false },
        transport: { level: 0, unlocked: false },
        factory: { level: 0, unlocked: false },
        lab: { level: 0, unlocked: false },
        portal: { level: 0, unlocked: false },
        timeMachine: { level: 0, unlocked: false },
        dimensionGate: { level: 0, unlocked: false },
      },
      playTime: 3600,
      totalWoolProduced: '200',
      totalPrestiges: 0,
      purchasedUpgrades: [],
      unlockedAchievements: [],
    }), 
    { headers }
  );
  
  const saveSuccess = check(saveResponse, {
    'save successful': (r) => r.status === 200,
    'save response time OK': (r) => r.timings.duration < 500,
  });
  
  successRate.add(saveSuccess);
  apiResponseTime.add(saveResponse.timings.duration);
  
  if (!saveSuccess) {
    errors.add(1);
  }
}

function testLeaderboardEndpoints() {
  // Test leaderboard (public endpoint)
  const leaderboardResponse = http.get(`${API_BASE_URL}/api/leaderboard`);
  
  const leaderboardSuccess = check(leaderboardResponse, {
    'leaderboard retrieved': (r) => r.status === 200,
    'leaderboard response time OK': (r) => r.timings.duration < 500,
    'leaderboard has data': (r) => {
      const data = JSON.parse(r.body);
      return data.success && Array.isArray(data.data);
    },
  });
  
  successRate.add(leaderboardSuccess);
  apiResponseTime.add(leaderboardResponse.timings.duration);
  
  if (!leaderboardSuccess) {
    errors.add(1);
  }
}

export function teardown(data) {
  console.log('Tearing down load test...');
  
  // Clean up test data if needed
  // Note: In a real scenario, you might want to clean up test users
  // For now, we'll leave them for repeated testing
  
  console.log('Load test completed');
}

// Stress test scenario
export function stressTest() {
  const stressOptions = {
    stages: [
      { duration: '2m', target: 500 },   // Ramp up to 500 users
      { duration: '5m', target: 500 },   // Stay at 500 users
      { duration: '2m', target: 1000 },  // Ramp up to 1000 users
      { duration: '5m', target: 1000 },  // Stay at 1000 users
      { duration: '2m', target: 0 },     // Ramp down
    ],
    thresholds: {
      'http_req_duration': ['p(95)<1000'], // 95% under 1 second
      'http_req_failed': ['rate<0.05'],    // Error rate under 5%
    },
  };
  
  return stressOptions;
}

// Spike test scenario
export function spikeTest() {
  const spikeOptions = {
    stages: [
      { duration: '1m', target: 100 },   // Normal load
      { duration: '30s', target: 2000 }, // Spike to 2000 users
      { duration: '1m', target: 100 },   // Back to normal
    ],
    thresholds: {
      'http_req_duration': ['p(95)<2000'], // 95% under 2 seconds
      'http_req_failed': ['rate<0.10'],    // Error rate under 10%
    },
  };
  
  return spikeOptions;
}

// Endurance test scenario
export function enduranceTest() {
  const enduranceOptions = {
    stages: [
      { duration: '5m', target: 200 },   // Ramp up
      { duration: '60m', target: 200 },  // Stay at 200 users for 1 hour
      { duration: '5m', target: 0 },     // Ramp down
    ],
    thresholds: {
      'http_req_duration': ['p(95)<500'],  // 95% under 500ms
      'http_req_failed': ['rate<0.01'],    // Error rate under 1%
    },
  };
  
  return enduranceOptions;
}