const math = require('mathjs');

const FUNCTIONS = new Set([
  'sqrt', 'log', 'log10', 'ln', 'exp', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'abs', 'round', 'floor', 'ceil', 'mean', 'variance', 'std', 'sum', 'min', 'max',
  'multiply', 'transpose', 'det', 'inv', 'complex', 'combinations', 'permutations',
  'factorial',
]);
const CONSTANTS = new Set(['pi', 'e', 'i']);
const OPERATORS = new Set(['+', '-', '*', '/', '^']);
const MAX_EXPRESSION = 240;
const MAX_NODES = 100;

function validScope(scope = {}) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) || Object.keys(scope).length > 12) {
    throw new TypeError('Invalid calculation scope');
  }
  const safe = new Map();
  for (const [name, value] of Object.entries(scope)) {
    if (!/^[a-z][a-z0-9_]{0,24}$/i.test(name) || CONSTANTS.has(name) || FUNCTIONS.has(name) ||
      typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e12) {
      throw new TypeError('Invalid calculation scope');
    }
    safe.set(name, value);
  }
  return safe;
}

function validateTree(root, scope) {
  let count = 0;
  function visit(node, depth) {
    count += 1;
    if (count > MAX_NODES || depth > 18) throw new TypeError('Calculation is too complex');
    if (node.isConstantNode) {
      if (typeof node.value !== 'number' || !Number.isFinite(node.value) || Math.abs(node.value) > 1e12) {
        throw new TypeError('Invalid calculation constant');
      }
      return;
    }
    if (node.isSymbolNode) {
      if (!CONSTANTS.has(node.name) && !scope.has(node.name)) throw new TypeError('Unknown calculation symbol');
      return;
    }
    if (node.isParenthesisNode) return visit(node.content, depth + 1);
    if (node.isOperatorNode && OPERATORS.has(node.op) && node.args.length <= 2) {
      if (node.op === '^' && node.args[1]?.isConstantNode && Math.abs(node.args[1].value) > 1000) {
        throw new TypeError('Calculation exponent is too large');
      }
      node.args.forEach((arg) => visit(arg, depth + 1));
      return;
    }
    if (node.isArrayNode && node.items.length <= 5) {
      node.items.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (node.isFunctionNode && node.fn?.isSymbolNode && FUNCTIONS.has(node.fn.name) && node.args.length <= 5) {
      if (['factorial', 'combinations', 'permutations'].includes(node.fn.name) &&
        node.args.some((arg) => !arg.isConstantNode || arg.value > 100 || arg.value < 0)) {
        throw new TypeError('Combinatorial calculation is too large');
      }
      node.args.forEach((arg) => visit(arg, depth + 1));
      return;
    }
    throw new TypeError('Unsupported calculation expression');
  }
  visit(root, 0);
}

function normalizeValue(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new TypeError('Calculation outside supported range');
    return value;
  }
  if (value?.isBigNumber) return normalizeValue(value.toNumber());
  if (value?.isComplex) return { re: normalizeValue(value.re), im: normalizeValue(value.im) };
  if (value && typeof value === 'object' && 're' in value && 'im' in value) {
    return { re: normalizeValue(value.re), im: normalizeValue(value.im) };
  }
  const array = value?.isMatrix ? value.toArray() : value;
  if (Array.isArray(array) && array.length <= 5) return array.map(normalizeValue);
  throw new TypeError('Unsupported calculation result');
}

function evaluateExpression(expression, scope = {}) {
  const input = String(expression || '').trim();
  if (!input || input.length > MAX_EXPRESSION) throw new TypeError('Invalid calculation expression');
  const safeScope = validScope(scope);
  const tree = math.parse(input);
  validateTree(tree, safeScope);
  return normalizeValue(tree.compile().evaluate(safeScope));
}

function equivalentValues(left, right, tolerance = 1e-6) {
  if (typeof left === 'number' && typeof right === 'number') {
    return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right));
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => equivalentValues(value, right[index], tolerance));
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    return equivalentValues(left.re, right.re, tolerance) && equivalentValues(left.im, right.im, tolerance);
  }
  return false;
}

function verifyCalculation({ expression, claimedResult, scope = {}, unit = '', tolerance = 1e-6 }) {
  try {
    const calculated = evaluateExpression(expression, scope);
    const claimed = typeof claimedResult === 'number' || Array.isArray(claimedResult) ||
      (claimedResult && typeof claimedResult === 'object')
      ? normalizeValue(claimedResult)
      : evaluateExpression(String(claimedResult || ''), scope);
    return { verified: equivalentValues(calculated, claimed, tolerance), calculated, claimed,
      unit: String(unit || '').trim().slice(0, 32) };
  } catch {
    return { verified: false, calculated: null, claimed: null, unit: String(unit || '').trim().slice(0, 32) };
  }
}

module.exports = { evaluateExpression, equivalentValues, verifyCalculation };
