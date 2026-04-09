// Vercel Serverless entry point
// This file exports the Express app so Vercel can run it as a function.
require('dotenv').config();
const app = require('../src/app');

module.exports = app;
