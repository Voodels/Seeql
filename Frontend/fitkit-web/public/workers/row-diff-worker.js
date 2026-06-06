self.onmessage = function (e) {
  const { leftRows, rightRows, columns } = e.data

  const leftSet = new Set(leftRows.map((r) => JSON.stringify(r)))
  const rightSet = new Set(rightRows.map((r) => JSON.stringify(r)))

  const added = rightRows.filter((r) => !leftSet.has(JSON.stringify(r)))
  const removed = leftRows.filter((r) => !rightSet.has(JSON.stringify(r)))
  const kept = rightRows.filter((r) => leftSet.has(JSON.stringify(r)))

  const changes = rightRows.map((r, i) => {
    const leftIdx = leftRows.findIndex((l) => columns.some((c) => l[c] === r[c]))
    return {
      row: r,
      index: i,
      status: leftSet.has(JSON.stringify(r)) ? "kept" : "new",
      moved: leftIdx >= 0 && leftIdx !== i,
      fromIndex: leftIdx,
    }
  })

  self.postMessage({ added, removed, kept, changes })
}
