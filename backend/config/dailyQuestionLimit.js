/** Max chat questions (POST /messages) per user per UTC calendar day (Redis counter). */
function getDailyQuestionLimit() {
  const n = parseInt(process.env.DAILY_QUESTION_LIMIT, 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

module.exports = { getDailyQuestionLimit };
