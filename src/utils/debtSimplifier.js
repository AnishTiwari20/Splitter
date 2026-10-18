/**
 * Debt Simplifier and Balance Calculator
 */

export function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates net balance for every friend in the group.
 * @param {Array} friends - List of friend objects { id, name }
 * @param {Array} expenses - List of active expense objects
 * @returns {Object} { [friendId]: number } (+ve means they are owed money, -ve means they owe money)
 */
export function calculateBalances(friends, expenses) {
  const balances = {};
  friends.forEach(f => {
    balances[f.id] = 0;
  });

  expenses.forEach(exp => {
    // Credit the payer
    const amt = Number(exp.amount) || 0;
    if (exp.payerId && balances[exp.payerId] !== undefined) {
      balances[exp.payerId] += amt;
    }

    // Debit the participants
    if (exp.splits) {
      Object.entries(exp.splits).forEach(([friendId, amountOwed]) => {
        if (balances[friendId] !== undefined) {
          balances[friendId] -= Number(amountOwed) || 0;
        }
      });
    }
  });

  // Clean rounding
  Object.keys(balances).forEach(id => {
    balances[id] = round(balances[id]);
    if (Math.abs(balances[id]) < 0.009) {
      balances[id] = 0;
    }
  });

  return balances;
}

/**
 * Computes minimal list of payments needed to settle all debts in a simple table structure.
 * @param {Object} balances - Output from calculateBalances
 * @param {Array} friends - List of friends for name resolution
 * @returns {Array} List of { from, to, fromName, toName, amount }
 */
export function simplifyDebts(balances, friends) {
  const friendMap = {};
  friends.forEach(f => { friendMap[f.id] = f; });

  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([id, net]) => {
    const val = round(net);
    if (val < -0.01) {
      debtors.push({ id, amount: Math.abs(val) });
    } else if (val > 0.01) {
      creditors.push({ id, amount: val });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settledAmount = round(Math.min(debtor.amount, creditor.amount));

    if (settledAmount > 0.01) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        fromName: friendMap[debtor.id]?.name || 'Unknown',
        toName: friendMap[creditor.id]?.name || 'Unknown',
        amount: settledAmount,
      });
    }

    debtor.amount = round(debtor.amount - settledAmount);
    creditor.amount = round(creditor.amount - settledAmount);

    if (debtor.amount <= 0.01) d++;
    if (creditor.amount <= 0.01) c++;
  }

  return transactions;
}

/**
 * Calculate full breakdown for tables: Member balances, settlements, and mathematical audit proof
 */
export function calculateDetailedSummary(friends, expenses) {
  const paidBy = {};
  const shareOf = {};
  const itemized = {};
  let totalAmount = 0;

  friends.forEach(f => {
    paidBy[f.id] = 0;
    shareOf[f.id] = 0;
    itemized[f.id] = {
      paidList: [],
      participatedList: [],
    };
  });

  expenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    totalAmount += amt;

    if (exp.payerId && paidBy[exp.payerId] !== undefined) {
      paidBy[exp.payerId] += amt;
      itemized[exp.payerId]?.paidList.push({
        description: exp.description,
        amount: amt,
      });
    }

    if (exp.splits) {
      const pCount = Object.keys(exp.splits).length;
      Object.entries(exp.splits).forEach(([fId, owed]) => {
        const owedAmt = Number(owed) || 0;
        if (shareOf[fId] !== undefined) {
          shareOf[fId] += owedAmt;
          itemized[fId]?.participatedList.push({
            description: exp.description,
            share: owedAmt,
            totalBill: amt,
            participantsCount: pCount,
          });
        }
      });
    }
  });

  const balances = calculateBalances(friends, expenses);
  const settlements = simplifyDebts(balances, friends);

  const memberRows = friends.map(f => {
    const paid = round(paidBy[f.id] || 0);
    const share = round(shareOf[f.id] || 0);
    const net = round(balances[f.id] || 0);

    let status = 'Settled';
    if (net > 0.01) status = 'Gets back';
    else if (net < -0.01) status = 'Owes';

    return {
      id: f.id,
      name: f.name,
      totalPaid: paid,
      fairShare: share,
      netBalance: net,
      status,
      details: itemized[f.id] || { paidList: [], participatedList: [] },
    };
  });

  // Mathematical checksums
  const totalPaidSum = round(memberRows.reduce((acc, r) => acc + r.totalPaid, 0));
  const totalShareSum = round(memberRows.reduce((acc, r) => acc + r.fairShare, 0));
  const netSum = round(memberRows.reduce((acc, r) => acc + r.netBalance, 0));
  const totalSettlementAmount = round(settlements.reduce((acc, s) => acc + s.amount, 0));

  const isMathValid = Math.abs(netSum) < 0.02 && Math.abs(totalPaidSum - totalShareSum) < 0.02;

  return {
    totalAmount: round(totalAmount),
    memberRows,
    settlements,
    audit: {
      totalPaidSum,
      totalShareSum,
      netSum,
      totalSettlementAmount,
      isMathValid,
    }
  };
}
