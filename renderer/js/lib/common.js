export function not(v){ return ! v }

/**
 * Permet de tester une valeur null/undefined mais qui peut
 * être égale à 0
 */
export function isNil(v){
  return not(v) && not(v === 0)
}

export function isBool(v){
  return ( v === true ) || ( v === false )
}
