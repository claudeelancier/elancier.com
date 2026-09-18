export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

export function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${end.x} ${end.y} A ${r} ${r} 0 ${largeArc} 1 ${start.x} ${start.y} Z`
}

export function segmentLabelPoint(cx, cy, r, startAngle, endAngle) {
  const mid = (startAngle + endAngle) / 2
  return polarToCartesian(cx, cy, r, mid)
}

/**
 * Pointer is fixed at the top (12 o'clock).
 * Segments are drawn starting at the top, moving clockwise.
 * CSS rotate() is clockwise-positive.
 * After extraTurns, the selected segment centre must sit under the pointer.
 */
export function rotationForWheelIndex(index, count, extraTurns = 6) {
  const slice = 360 / count
  const target = (index + 0.5) * slice
  return extraTurns * 360 - target
}

export function nextSpinRotation(current, index, count, extraTurns = 6) {
  const slice = 360 / count
  const targetMod = ((-(index + 0.5) * slice) % 360 + 360) % 360
  const currentMod = ((current % 360) + 360) % 360
  const delta = (targetMod - currentMod + 360) % 360
  return current + extraTurns * 360 + delta
}

export function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight || 0), 0)
  let roll = Math.random() * total
  for (const item of items) {
    roll -= Math.max(0, item.weight || 0)
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}
