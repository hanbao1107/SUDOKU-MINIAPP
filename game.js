const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')

let width, height
let cellSize
let dpr = 1
let statusBarHeight = 0
let safeTop = 20
let board = []
let solution = []
let fixed = []
let hint = []
let error = []
let selectedCell = null
let difficulty = 'easy'
let timer = 0
let timerInterval = null
let easyCount = 0
let mediumCount = 0
let hardCount = 0
let remaining = 81
let pressedBtn = null
let currentScreen = 'home'
let settingsMenuOpen = false
let confirmDialogOpen = false

const colors = {
  background: '#f0f4f8',
  board: '#ffffff',
  border: '#1a365d',
  cellBorder: '#e2e8f0',
  selected: '#bee3f8',
  highlight: '#e6fffa',
  hint: '#c6f6d5',
  error: '#fee2e2',
  fixedText: '#1a365d',
  userText: '#2b6cb0',
  hintText: '#22543d',
  btnPrimary: '#3182ce',
  btnSecondary: '#a0aec0',
  btnActive: '#2b6cb0',
  btnPressed: '#1e4d7b',
  text: '#102a43'
}

function drawRoundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

let gameWidth

function init() {
  const systemInfo = wx.getSystemInfoSync()
  width = systemInfo.windowWidth
  height = systemInfo.windowHeight
  dpr = systemInfo.pixelRatio || 2
  statusBarHeight = systemInfo.statusBarHeight || 20
  safeTop = statusBarHeight + 10
  










  const maxWidth = 420
  let targetGameWidth = Math.min(width, maxWidth)
  
  let cellSizeByWidth = Math.floor((targetGameWidth - 40) / 9)
  
  let currentGameWidth = cellSizeByWidth * 9 + 40
  let currentNumBtnHeight = (currentGameWidth - 75) / 5
  let currentMinHeight = safeTop + 105 + cellSizeByWidth * 9 + 15 + 45 + 15 + currentNumBtnHeight * 3 + 6 * 2 + 20
  
  while (currentMinHeight > height && cellSizeByWidth > 25) {
    cellSizeByWidth--
    currentGameWidth = cellSizeByWidth * 9 + 40
    currentNumBtnHeight = (currentGameWidth - 75) / 5
    currentMinHeight = safeTop + 105 + cellSizeByWidth * 9 + 15 + 45 + 15 + currentNumBtnHeight * 3 + 6 * 2 + 20
  }
  
  cellSize = cellSizeByWidth
  gameWidth = currentGameWidth
  
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)
  
  renderHome()
  
  wx.onTouchStart(handleInput)
}

function setDifficulty(newDifficulty) {
  difficulty = newDifficulty
  newGame()
}

function newGame() {
  stopTimer()
  timer = 0
  
  if (difficulty === 'easy') easyCount++
  else if (difficulty === 'medium') mediumCount++
  else hardCount++
  
  generatePuzzle()
  startTimer()
  render()
}

function generatePuzzle() {
  solution = generateSolution()
  board = solution.map(row => [...row])
  fixed = solution.map(row => row.map(() => true))
  hint = solution.map(row => row.map(() => false))
  error = solution.map(row => row.map(() => false))
  selectedCell = null
  
  const cellsToRemove = {
    easy: 35,
    medium: 45,
    hard: 55
  }
  
  const target = cellsToRemove[difficulty]
  const positions = []
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      positions.push({ row: i, col: j })
    }
  }
  
  shuffleArray(positions)
  
  let removed = 0
  for (const pos of positions) {
    if (removed >= target) break
    
    const temp = board[pos.row][pos.col]
    board[pos.row][pos.col] = 0
    
    if (countSolutions(board.map(r => [...r])) === 1) {
      fixed[pos.row][pos.col] = false
      removed++
    } else {
      board[pos.row][pos.col] = temp
    }
  }
  
  remaining = board.flat().filter(cell => cell === 0).length
}

function generateSolution() {
  const board = Array(9).fill(null).map(() => Array(9).fill(0))
  solve(board)
  return board
}

function solve(board) {
  const empty = findEmpty(board)
  if (!empty) return true
  
  const [row, col] = empty
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  shuffleArray(nums)
  
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num
      if (solve(board)) return true
      board[row][col] = 0
    }
  }
  return false
}

function countSolutions(board, limit = 2) {
  const empty = findEmpty(board)
  if (!empty) return 1
  
  const [row, col] = empty
  let count = 0
  
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num
      count += countSolutions(board, limit)
      board[row][col] = 0
      if (count >= limit) return count
    }
  }
  
  return count
}

function findEmpty(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) return [i, j]
    }
  }
  return null
}

function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false
  }
  
  for (let i = 0; i < 9; i++) {
    if (board[i][col] === num) return false
  }
  
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[boxRow + i][boxCol + j] === num) return false
    }
  }
  
  return true
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

function handleInput(e) {
  let x, y
  
  if (e.touches && e.touches.length > 0) {
    x = e.touches[0].clientX
    y = e.touches[0].clientY
  } else if (e.clientX !== undefined) {
    x = e.clientX
    y = e.clientY
  } else {
    return
  }
  
  if (currentScreen === 'home') {
    const logoSize = Math.min(width, height) * 0.35
    const logoY = (height - logoSize) / 2 - 60
    const btnWidth = Math.min(width - 80, 280)
    const btnHeight = 60
    const btnX = (width - btnWidth) / 2
    const btnY = logoY + logoSize + 60
    
    if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
      pressedBtn = { type: 'startGame' }
      renderHome()
      setTimeout(() => {
        pressedBtn = null
        currentScreen = 'game'
        newGame()
      }, 150)
    }
    return
  }
  
  const settingsBtnSize = 40
  const settingsBtnX = 15
  const settingsBtnY = safeTop + 15
  
  if (x >= settingsBtnX && x <= settingsBtnX + settingsBtnSize && y >= settingsBtnY && y <= settingsBtnY + settingsBtnSize) {
    pressedBtn = { type: 'settings' }
    render()
    setTimeout(() => {
      pressedBtn = null
      settingsMenuOpen = !settingsMenuOpen
      render()
    }, 150)
    return
  }
  
  if (settingsMenuOpen) {
    const menuWidth = 200
    const menuHeight = 100
    const menuX = (width - menuWidth) / 2
    const menuY = (height - menuHeight) / 2
    
    const backBtnY = menuY + 25
    const backBtnHeight = 50
    
    if (x >= menuX && x <= menuX + menuWidth && y >= backBtnY && y <= backBtnY + backBtnHeight) {
      pressedBtn = { type: 'backToHome' }
      render()
      setTimeout(() => {
        pressedBtn = null
        settingsMenuOpen = false
        confirmDialogOpen = true
        render()
      }, 150)
      return
    }
    
    if (x < menuX || x > menuX + menuWidth || y < menuY || y > menuY + menuHeight) {
      settingsMenuOpen = false
      render()
      return
    }
    return
  }
  
  if (confirmDialogOpen) {
    const dialogWidth = 280
    const dialogHeight = 160
    const dialogX = (width - dialogWidth) / 2
    const dialogY = (height - dialogHeight) / 2
    
    const btnWidth = 110
    const btnHeight = 40
    const btnY = dialogY + 110
    const gap = 20
    const totalBtnWidth = btnWidth * 2 + gap
    const startX = dialogX + (dialogWidth - totalBtnWidth) / 2
    
    const noBtnX = startX
    const yesBtnX = startX + btnWidth + gap
    
    if (x >= yesBtnX && x <= yesBtnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
      pressedBtn = { type: 'confirmYes' }
      render()
      setTimeout(() => {
        pressedBtn = null
        currentScreen = 'home'
        confirmDialogOpen = false
        stopTimer()
        renderHome()
      }, 150)
      return
    }
    
    if (x >= noBtnX && x <= noBtnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
      pressedBtn = { type: 'confirmNo' }
      render()
      setTimeout(() => {
        pressedBtn = null
        confirmDialogOpen = false
        render()
      }, 150)
      return
    }
    
    if (x < dialogX || x > dialogX + dialogWidth || y < dialogY || y > dialogY + dialogHeight) {
      confirmDialogOpen = false
      render()
      return
    }
    return
  }
  
  const infoY = safeTop
  if (y >= infoY && y <= infoY + 55 && (x < settingsBtnX || x > settingsBtnX + settingsBtnSize)) {
    return
  }
  
  const diffBtnY = safeTop + 60
  const diffBtnWidth = (gameWidth - 60) / 3
  const diffBtnHeight = 35
  const offsetX = (width - gameWidth) / 2
  
  const diffBtns = [
    { action: () => setDifficulty('easy'), x: offsetX + 15 },
    { action: () => setDifficulty('medium'), x: offsetX + 15 + diffBtnWidth + 10 },
    { action: () => setDifficulty('hard'), x: offsetX + 15 + (diffBtnWidth + 10) * 2 }
  ]
  
  for (const btn of diffBtns) {
    if (x >= btn.x && x <= btn.x + diffBtnWidth && y >= diffBtnY && y <= diffBtnY + diffBtnHeight) {
      btn.action()
      return
    }
  }
  
  const boardOffsetX = offsetX + 20
  const boardOffsetY = safeTop + 105
  
  const boardCol = Math.floor((x - boardOffsetX) / cellSize)
  const boardRow = Math.floor((y - boardOffsetY) / cellSize)
  
  if (boardRow >= 0 && boardRow < 9 && boardCol >= 0 && boardCol < 9) {
    selectedCell = { row: boardRow, col: boardCol }
    render()
    return
  }
  
  const ctrlBtnY = boardOffsetY + cellSize * 9 + 15
  const ctrlBtnWidth = (gameWidth - 60) / 4
  const ctrlBtnHeight = 45
  
  const ctrlBtns = [newGame, checkBoard, giveHint, submitBoard]
  
  for (let i = 0; i < 4; i++) {
    const btnX = offsetX + 15 + i * (ctrlBtnWidth + 10)
    if (x >= btnX && x <= btnX + ctrlBtnWidth && y >= ctrlBtnY && y <= ctrlBtnY + ctrlBtnHeight) {
      pressedBtn = { type: 'ctrl', index: i }
      render()
      setTimeout(() => {
        pressedBtn = null
        render()
      }, 150)
      ctrlBtns[i]()
      return
    }
  }
  
  const numBtnWidth = (gameWidth - 60) / 5
  const numBtnHeight = (gameWidth - 75) / 5
  const numPadHeight = numBtnHeight * 3 + 6 * 2
  const numPadWidth = 4 * numBtnWidth + 3 * 6
  const numPadOffsetX = (width - numPadWidth) / 2
  const numPadY = ctrlBtnY + ctrlBtnHeight + 15
  
  for (let i = 1; i <= 9; i++) {
    const row = Math.floor((i - 1) / 3)
    const col = (i - 1) % 3
    const numX = numPadOffsetX + col * (numBtnWidth + 6)
    const numY = numPadY + row * (numBtnHeight + 6)
    
    if (x >= numX && x <= numX + numBtnWidth && y >= numY && y <= numY + numBtnHeight) {
      pressedBtn = { type: 'num', value: i }
      render()
      setTimeout(() => {
        pressedBtn = null
        render()
      }, 150)
      if (selectedCell) {
        const { row: selRow, col: selCol } = selectedCell
        if (!fixed[selRow][selCol]) {
          board[selRow][selCol] = i
          error[selRow][selCol] = false
          remaining = board.flat().filter(cell => cell === 0).length
          render()
        }
      }
      return
    }
  }
  
  const clearX = numPadOffsetX + 3 * (numBtnWidth + 6)
  const clearY = numPadY
  
  if (x >= clearX && x <= clearX + numBtnWidth && y >= clearY && y <= clearY + numPadHeight) {
    pressedBtn = { type: 'clear' }
    render()
    setTimeout(() => {
      pressedBtn = null
      render()
    }, 150)
    if (selectedCell) {
        const { row: selRow, col: selCol } = selectedCell
        if (!fixed[selRow][selCol]) {
          board[selRow][selCol] = 0
          error[selRow][selCol] = false
          remaining = board.flat().filter(cell => cell === 0).length
          render()
        }
      }
    return
  }
}

function render() {
  if (currentScreen === 'home') {
    renderHome()
    return
  }
  
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, width, height)
  
  renderInfo()
  renderDifficultyButtons()
  renderBoard()
  renderControls()
  renderNumberPad()
  
  renderSettingsMenu()
  renderConfirmDialog()
}

function renderHome() {
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, width, height)
  
  const logoSize = Math.min(width, height) * 0.35
  const logoX = (width - logoSize) / 2
  const logoY = (height - logoSize) / 2 - 60
  
  ctx.fillStyle = colors.board
  drawRoundRect(logoX, logoY, logoSize, logoSize, 20)
  ctx.fill()
  
  ctx.strokeStyle = colors.border
  ctx.lineWidth = 4
  ctx.stroke()
  
  ctx.fillStyle = colors.border
  ctx.font = `bold ${logoSize * 0.18}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  const gridSize = logoSize - 40
  const gridOffsetX = logoX + 20
  const gridOffsetY = logoY + 20
  const cellSize = gridSize / 9
  
  for (let i = 0; i <= 9; i++) {
    ctx.beginPath()
    ctx.lineWidth = (i % 3 === 0) ? 3 : 1
    ctx.moveTo(gridOffsetX, gridOffsetY + i * cellSize)
    ctx.lineTo(gridOffsetX + gridSize, gridOffsetY + i * cellSize)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(gridOffsetX + i * cellSize, gridOffsetY)
    ctx.lineTo(gridOffsetX + i * cellSize, gridOffsetY + gridSize)
    ctx.stroke()
  }
  
  const btnWidth = Math.min(width - 80, 280)
  const btnHeight = 60
  const btnX = (width - btnWidth) / 2
  const btnY = logoY + logoSize + 60
  
  if (pressedBtn?.type === 'startGame') {
    ctx.fillStyle = '#154a7a'
  } else {
    ctx.fillStyle = colors.btnPrimary
  }
  drawRoundRect(btnX, btnY, btnWidth, btnHeight, 30)
  ctx.fill()
  
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('数独', btnX + btnWidth / 2, btnY + btnHeight / 2)
  
  ctx.font = '14px Arial'
  ctx.fillStyle = '#718096'
  ctx.fillText('挑战你的逻辑思维', width / 2, btnY + btnHeight + 40)
}

function renderInfo() {
  const y = safeTop + 20
  
  ctx.fillStyle = colors.text
  ctx.font = 'bold 18px Arial'
  ctx.textAlign = 'center'
  
  let title = ''
  if (difficulty === 'easy') title = `数独 - 简单第${easyCount}题`
  else if (difficulty === 'medium') title = `数独 - 中等第${mediumCount}题`
  else title = `数独 - 困难第${hardCount}题`
  
  ctx.fillText(title, width / 2, y)
  
  ctx.font = '14px Arial'
  ctx.fillStyle = '#4a5568'
  ctx.fillText(`剩余: ${remaining}  |  时间: ${formatTime(timer)}`, width / 2, y + 22)
  
  const settingsBtnSize = 40
  const settingsBtnX = 15
  const settingsBtnY = safeTop + 15
  
  if (pressedBtn?.type === 'settings') {
    ctx.fillStyle = '#5a6a7a'
  } else {
    ctx.fillStyle = colors.btnSecondary
  }
  drawRoundRect(settingsBtnX, settingsBtnY, settingsBtnSize, settingsBtnSize, 10)
  ctx.fill()
  
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⚙', settingsBtnX + settingsBtnSize / 2, settingsBtnY + settingsBtnSize / 2)
}

function renderSettingsMenu() {
  if (!settingsMenuOpen) return
  
  const menuWidth = 200
  const menuHeight = 100
  const menuX = (width - menuWidth) / 2
  const menuY = (height - menuHeight) / 2
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, width, height)
  
  ctx.fillStyle = colors.board
  drawRoundRect(menuX, menuY, menuWidth, menuHeight, 12)
  ctx.fill()
  
  ctx.fillStyle = colors.border
  ctx.lineWidth = 1
  ctx.stroke()
  
  const backBtnY = menuY + 25
  const backBtnHeight = 50
  const backBtnWidth = menuWidth - 40
  const backBtnX = menuX + 20
  
  if (pressedBtn?.type === 'backToHome') {
    ctx.fillStyle = '#cbd5e0'
  } else {
    ctx.fillStyle = '#edf2f7'
  }
  drawRoundRect(backBtnX, backBtnY, backBtnWidth, backBtnHeight, 8)
  ctx.fill()
  
  ctx.fillStyle = colors.text
  ctx.font = 'bold 18px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('返回主界面', menuX + menuWidth / 2, backBtnY + backBtnHeight / 2)
}

function renderConfirmDialog() {
  if (!confirmDialogOpen) return
  
  const dialogWidth = 280
  const dialogHeight = 160
  const dialogX = (width - dialogWidth) / 2
  const dialogY = (height - dialogHeight) / 2
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, width, height)
  
  ctx.fillStyle = colors.board
  drawRoundRect(dialogX, dialogY, dialogWidth, dialogHeight, 12)
  ctx.fill()
  
  ctx.fillStyle = colors.border
  ctx.lineWidth = 1
  ctx.stroke()
  
  ctx.fillStyle = colors.text
  ctx.font = 'bold 18px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('确定返回主界面？', dialogX + dialogWidth / 2, dialogY + 40)
  
  ctx.fillStyle = '#718096'
  ctx.font = '12px Arial'
  ctx.fillText('如确认返回，当前已开始游戏记录无法保存', dialogX + dialogWidth / 2, dialogY + 75)
  
  const btnWidth = 110
  const btnHeight = 40
  const btnY = dialogY + 110
  const gap = 20
  const totalBtnWidth = btnWidth * 2 + gap
  const startX = dialogX + (dialogWidth - totalBtnWidth) / 2
  
  const noBtnX = startX
  if (pressedBtn?.type === 'confirmNo') {
    ctx.fillStyle = '#5a6a7a'
  } else {
    ctx.fillStyle = colors.btnSecondary
  }
  drawRoundRect(noBtnX, btnY, btnWidth, btnHeight, 8)
  ctx.fill()
  
  ctx.fillStyle = '#1a365d'
  ctx.font = 'bold 14px Arial'
  ctx.fillText('返回游戏', noBtnX + btnWidth / 2, btnY + btnHeight / 2)
  
  const yesBtnX = startX + btnWidth + gap
  if (pressedBtn?.type === 'confirmYes') {
    ctx.fillStyle = '#154a7a'
  } else {
    ctx.fillStyle = colors.btnPrimary
  }
  drawRoundRect(yesBtnX, btnY, btnWidth, btnHeight, 8)
  ctx.fill()
  
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Arial'
  ctx.fillText('确定', yesBtnX + btnWidth / 2, btnY + btnHeight / 2)
}

function renderDifficultyButtons() {
  const y = safeTop + 60
  const btnWidth = (gameWidth - 60) / 3
  const btnHeight = 35
  const offsetX = (width - gameWidth) / 2
  
  const difficulties = [
    { text: '简单', value: 'easy' },
    { text: '中等', value: 'medium' },
    { text: '困难', value: 'hard' }
  ]
  
  difficulties.forEach((diff, index) => {
    const x = offsetX + 15 + index * (btnWidth + 10)
    const isActive = difficulty === diff.value
    
    ctx.fillStyle = isActive ? colors.btnActive : colors.btnSecondary
    drawRoundRect(x, y, btnWidth, btnHeight, 8)
    ctx.fill()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(diff.text, x + btnWidth / 2, y + btnHeight / 2)
  })
}

function renderBoard() {
  const offsetX = (width - gameWidth) / 2 + 20
  const offsetY = safeTop + 105
  
  ctx.fillStyle = colors.board
  drawRoundRect(offsetX, offsetY, cellSize * 9, cellSize * 9, 12)
  ctx.fill()
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const x = offsetX + j * cellSize
      const y = offsetY + i * cellSize
      
      if (selectedCell) {
        if (selectedCell.row === i && selectedCell.col === j) {
          ctx.fillStyle = colors.selected
          ctx.fillRect(x, y, cellSize, cellSize)
        } else if (
          selectedCell.row === i ||
          selectedCell.col === j ||
          (Math.floor(selectedCell.row / 3) === Math.floor(i / 3) &&
            Math.floor(selectedCell.col / 3) === Math.floor(j / 3))
        ) {
          ctx.fillStyle = colors.highlight
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }
      
      if (hint[i][j]) {
        ctx.fillStyle = colors.hint
        ctx.fillRect(x, y, cellSize, cellSize)
      }
      
      if (error[i][j]) {
        ctx.fillStyle = colors.error
        ctx.fillRect(x, y, cellSize, cellSize)
      }
      
      if (board[i][j] !== 0) {
        ctx.fillStyle = fixed[i][j] ? colors.fixedText : hint[i][j] ? colors.hintText : colors.userText
        ctx.font = `bold ${cellSize * 0.5}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(board[i][j], x + cellSize / 2, y + cellSize / 2)
      }
    }
  }
  
  ctx.strokeStyle = colors.border
  ctx.lineWidth = 2
  ctx.stroke()
  
  ctx.strokeStyle = colors.cellBorder
  ctx.lineWidth = 1
  for (let i = 1; i < 9; i++) {
    ctx.beginPath()
    ctx.moveTo(offsetX + 0.5, offsetY + i * cellSize)
    ctx.lineTo(offsetX + cellSize * 9 - 0.5, offsetY + i * cellSize)
    ctx.stroke()
  }
  
  for (let j = 1; j < 9; j++) {
    ctx.beginPath()
    ctx.moveTo(offsetX + j * cellSize, offsetY + 0.5)
    ctx.lineTo(offsetX + j * cellSize, offsetY + cellSize * 9 - 0.5)
    ctx.stroke()
  }
  
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  for (let i = 1; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(offsetX + 0.5, offsetY + cellSize * 3 * i)
    ctx.lineTo(offsetX + cellSize * 9 - 0.5, offsetY + cellSize * 3 * i)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(offsetX + cellSize * 3 * i, offsetY + 0.5)
    ctx.lineTo(offsetX + cellSize * 3 * i, offsetY + cellSize * 9 - 0.5)
    ctx.stroke()
  }
}

function renderControls() {
  const offsetY = safeTop + 105
  const startY = offsetY + cellSize * 9 + 15
  const btnWidth = (gameWidth - 60) / 4
  const btnHeight = 45
  const offsetX = (width - gameWidth) / 2
  
  const btns = [
    { text: '新游戏', color: colors.btnPrimary },
    { text: '检查', color: colors.btnPrimary },
    { text: '提示', color: colors.btnPrimary },
    { text: '提交', color: colors.btnPrimary }
  ]
  
  btns.forEach((btn, index) => {
    const x = offsetX + 15 + index * (btnWidth + 10)
    const y = startY
    const isPressed = pressedBtn && pressedBtn.type === 'ctrl' && pressedBtn.index === index
    
    ctx.fillStyle = isPressed ? colors.btnPressed : btn.color
    drawRoundRect(x, y, btnWidth, btnHeight, 10)
    ctx.fill()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 15px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(btn.text, x + btnWidth / 2, y + btnHeight / 2)
  })
}

function renderNumberPad() {
  const offsetY = safeTop + 105
  const ctrlBtnY = offsetY + cellSize * 9 + 15
  const ctrlBtnHeight = 45
  const numPadY = ctrlBtnY + ctrlBtnHeight + 15
  
  const numBtnWidth = (gameWidth - 60) / 5
  const numBtnHeight = (gameWidth - 75) / 5
  const numPadHeight = numBtnHeight * 3 + 6 * 2
  const numPadWidth = 4 * numBtnWidth + 3 * 6
  const numPadOffsetX = (width - numPadWidth) / 2
  
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  
  numbers.forEach((num, index) => {
    const row = Math.floor(index / 3)
    const col = index % 3
    const x = numPadOffsetX + col * (numBtnWidth + 6)
    const y = numPadY + row * (numBtnHeight + 6)
    const isPressed = pressedBtn && pressedBtn.type === 'num' && pressedBtn.value === num
    
    ctx.fillStyle = isPressed ? colors.btnPressed : colors.btnPrimary
    drawRoundRect(x, y, numBtnWidth, numBtnHeight, 10)
    ctx.fill()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${numBtnWidth * 0.45}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(num, x + numBtnWidth / 2, y + numBtnHeight / 2)
  })
  
  const clearX = numPadOffsetX + 3 * (numBtnWidth + 6)
  const clearY = numPadY
  const isClearPressed = pressedBtn && pressedBtn.type === 'clear'
  
  ctx.fillStyle = isClearPressed ? '#718096' : colors.btnSecondary
  drawRoundRect(clearX, clearY, numBtnWidth, numPadHeight, 10)
  ctx.fill()
  
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${numBtnWidth * 0.35}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('清除', clearX + numBtnWidth / 2, clearY + numPadHeight / 2)
}

function checkBoard() {
  let errors = 0
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== 0 && board[i][j] !== solution[i][j]) {
        errors++
        error[i][j] = true
      } else {
        error[i][j] = false
      }
    }
  }
  
  render()
  
  if (errors === 0) {
    wx.showToast({
      title: '没有错误！',
      icon: 'success'
    })
  } else {
    wx.showModal({
      title: `发现 ${errors} 个错误`,
      content: '是否清除所有错误格子？',
      success: (res) => {
        if (res.confirm) {
          clearErrors()
        }
      }
    })
  }
}

function giveHint() {
  const emptyCells = []
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) {
        emptyCells.push({ row: i, col: j })
      }
    }
  }
  
  if (emptyCells.length === 0) {
    wx.showToast({ title: '没有空格了！', icon: 'none' })
    return
  }
  
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  board[randomCell.row][randomCell.col] = solution[randomCell.row][randomCell.col]
  hint[randomCell.row][randomCell.col] = true
  remaining = board.flat().filter(cell => cell === 0).length
  
  wx.showToast({ title: '已给出一个提示', icon: 'success' })
  render()
}

function submitBoard() {
  if (remaining > 0) {
    wx.showToast({ title: `还未完成，剩余格子数：${remaining}`, icon: 'none' })
    return
  }
  
  let errors = 0
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== solution[i][j]) {
        errors++
      }
    }
  }
  
  if (errors === 0) {
    stopTimer()
    wx.showModal({
      title: '恭喜完成',
      content: `用时 ${formatTime(timer)}，是否进入下一关？`,
      success: (res) => {
        if (res.confirm) {
          newGame()
        }
      }
    })
  } else {
    wx.showModal({
      title: '发现错误',
      content: `发现 ${errors} 个错误，是否清除错误格子？`,
      success: (res) => {
        if (res.confirm) {
          clearErrors()
        }
      }
    })
  }
}

function clearErrors() {
  let newRemaining = 0
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== 0 && board[i][j] !== solution[i][j] && !hint[i][j]) {
        board[i][j] = 0
      }
      if (board[i][j] === 0) newRemaining++
    }
  }
  remaining = newRemaining
  wx.showToast({ title: '已清除错误格子', icon: 'success' })
  render()
}

function startTimer() {
  timerInterval = setInterval(() => {
    timer++
    render()
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

init()