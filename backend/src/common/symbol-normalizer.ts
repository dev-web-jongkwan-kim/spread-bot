/**
 * Symbol Normalizer Utility
 * 
 * Handles normalization of crypto symbols across exchanges.
 * Supports 1000x, 10000x, 1000000x prefixes (common in futures/perpetuals).
 */

export interface NormalizedSymbol {
  originalSymbol: string;
  baseSymbol: string;
  multiplier: number;
  hasPrefix: boolean;
}

/**
 * Normalize a symbol by removing numeric prefixes
 * @param symbol The exchange symbol (e.g., "1000SHIB", "1000000MOG")
 * @returns NormalizedSymbol with base symbol and multiplier
 */
export function normalizeSymbol(symbol: string): NormalizedSymbol {
  const upperSymbol = symbol.toUpperCase();
  
  // Match patterns: 1000SHIB, 10000RATS, 1000000MOG, etc.
  const prefixMatch = upperSymbol.match(/^(1+0+)([A-Z]+)$/);
  
  if (prefixMatch) {
    const multiplier = parseInt(prefixMatch[1]);
    const baseSymbol = prefixMatch[2];
    
    return {
      originalSymbol: symbol,
      baseSymbol,
      multiplier,
      hasPrefix: true,
    };
  }
  
  return {
    originalSymbol: symbol,
    baseSymbol: upperSymbol,
    multiplier: 1,
    hasPrefix: false,
  };
}

/**
 * Normalize price based on symbol multiplier
 * @param price The original price from exchange
 * @param multiplier The multiplier (e.g., 1000 for 1000SHIB)
 * @returns Normalized price (price * multiplier)
 */
export function normalizePrice(price: number, multiplier: number): number {
  return price * multiplier;
}

/**
 * Denormalize price for display
 * @param normalizedPrice The normalized price
 * @param multiplier The multiplier
 * @returns Original exchange price
 */
export function denormalizePrice(normalizedPrice: number, multiplier: number): number {
  return normalizedPrice / multiplier;
}

/**
 * Check if two symbols represent the same asset
 * @param symbol1 First symbol (e.g., "1000SHIB")
 * @param symbol2 Second symbol (e.g., "SHIB")
 * @returns true if they represent the same base asset
 */
export function isSameAsset(symbol1: string, symbol2: string): boolean {
  const normalized1 = normalizeSymbol(symbol1);
  const normalized2 = normalizeSymbol(symbol2);
  
  return normalized1.baseSymbol === normalized2.baseSymbol;
}

/**
 * Get the relative multiplier between two symbols
 * @param fromSymbol Source symbol (e.g., "1000SHIB")
 * @param toSymbol Target symbol (e.g., "SHIB")
 * @returns Relative multiplier (e.g., 1000)
 */
export function getRelativeMultiplier(fromSymbol: string, toSymbol: string): number {
  const from = normalizeSymbol(fromSymbol);
  const to = normalizeSymbol(toSymbol);
  
  if (from.baseSymbol !== to.baseSymbol) {
    throw new Error(`Cannot calculate multiplier between different assets: ${fromSymbol} and ${toSymbol}`);
  }
  
  return from.multiplier / to.multiplier;
}

/**
 * Convert price from one symbol to another
 * @param price Price in fromSymbol terms
 * @param fromSymbol Source symbol (e.g., "1000SHIB")
 * @param toSymbol Target symbol (e.g., "SHIB")
 * @returns Price in toSymbol terms
 */
export function convertPrice(
  price: number,
  fromSymbol: string,
  toSymbol: string,
): number {
  const multiplier = getRelativeMultiplier(fromSymbol, toSymbol);
  return price * multiplier;
}

/**
 * Known 1000x symbols mapping
 * Keys are base symbols, values are arrays of known prefixed versions
 */
export const KNOWN_PREFIXED_SYMBOLS: Record<string, string[]> = {
  SHIB: ['1000SHIB'],
  PEPE: ['1000PEPE'],
  FLOKI: ['1000FLOKI'],
  BONK: ['1000BONK'],
  LUNC: ['1000LUNC'],
  XEC: ['1000XEC'],
  SATS: ['1000SATS'],
  RATS: ['1000RATS'],
  WHY: ['1000WHY'],
  CAT: ['1000CAT'],
  CHEEMS: ['1000CHEEMS', '1000000CHEEMS'],
  MOG: ['1000000MOG'],
  BABYDOGE: ['1MBABYDOGE', '1000000BABYDOGE'],
  BOB: ['1000000BOB'],
  NEIROCTO: ['1000NEIROCTO'],
};

/**
 * Get all known variants of a symbol
 * @param baseSymbol The base symbol (e.g., "SHIB")
 * @returns Array of known variants including the base
 */
export function getSymbolVariants(baseSymbol: string): string[] {
  const upper = baseSymbol.toUpperCase();
  const variants = [upper];
  
  // Check if it's a known prefixed symbol
  if (KNOWN_PREFIXED_SYMBOLS[upper]) {
    variants.push(...KNOWN_PREFIXED_SYMBOLS[upper]);
  }
  
  // Check if input is already a prefixed version
  const normalized = normalizeSymbol(upper);
  if (normalized.hasPrefix && !variants.includes(normalized.baseSymbol)) {
    variants.push(normalized.baseSymbol);
  }
  
  return variants;
}

/**
 * Find best matching symbol from available symbols
 * @param targetSymbol The symbol we're looking for
 * @param availableSymbols List of available symbols on exchange
 * @returns Best match or null
 */
export function findBestMatch(
  targetSymbol: string,
  availableSymbols: string[],
): { symbol: string; multiplier: number } | null {
  const target = normalizeSymbol(targetSymbol);
  const upperAvailable = availableSymbols.map((s) => s.toUpperCase());
  
  // 1. Exact match
  if (upperAvailable.includes(targetSymbol.toUpperCase())) {
    return { symbol: targetSymbol.toUpperCase(), multiplier: 1 };
  }
  
  // 2. Find same base asset
  for (const available of upperAvailable) {
    const normalized = normalizeSymbol(available);
    if (normalized.baseSymbol === target.baseSymbol) {
      const multiplier = target.multiplier / normalized.multiplier;
      return { symbol: available, multiplier };
    }
  }
  
  return null;
}

