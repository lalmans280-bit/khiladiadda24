const ADMIN_COMMISSION_PERCENT = 3;
const ADMIN_COMMISSION_RATE = ADMIN_COMMISSION_PERCENT / 100;
const WINNER_PAYOUT_PERCENT = 100 - ADMIN_COMMISSION_PERCENT;

function calculateMatchPayout(totalPool) {
  const adminCommission = totalPool * ADMIN_COMMISSION_RATE;
  return {
    winAmount: totalPool - adminCommission,
    adminCommission
  };
}

module.exports = {
  ADMIN_COMMISSION_PERCENT,
  WINNER_PAYOUT_PERCENT,
  calculateMatchPayout
};
