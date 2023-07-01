
const diceEmojis = '⚀⚁⚂⚃⚄⚅'
const faceEmojis = '😭😣😕🙂😃'

function getTemplate(selector) {
  let t = document.querySelector(selector).content.firstElementChild
  return () => {
    return t.cloneNode(true)
  }
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function roll(n) {
  return getRandomIntInclusive(1, n)
}

function newUI(data) {
  let state = {
  }

  let upStream = {
    send(cmd) {
      sendCommand(cmd)
    }
  }

  let components = []

  let addComponent = (f) => {
    components.push(f(data, upStream))
  }

  let sendCommand = (cmd) => {
    // console.log('command', cmd)
    for (let c of components) {
      c.onCommand && c.onCommand(cmd)
    }
  }

  let dumpState = () => {
    console.log(state)
  }

  let onUpdate = u => {
    // console.log('rxu', JSON.stringify(u))
    state = u

    for (let c of components) {
      c.onUpdate && c.onUpdate(state)
    }
  }

  return {
    addComponent,
    sendCommand,
    dumpState,
    onUpdate
  }
}

function makePlayersList(_data, up) {
  let div = document.querySelector('.players')
  let list = div.querySelector('.list')
  let playerTmpl = getTemplate('#playertemplate')
  let skillTmpl = getTemplate('#skilltemplate')

  ;(() => {
    let addButton = div.querySelector('.add')
    addButton.addEventListener('click', e => {
      up.send({ do: 'makeplayer' })
    })
  })()

  let onCommand = c => {
  }

  let onUpdate = s => {
    list.replaceChildren()
    for (let pl of s.players) {
      let div = playerTmpl()
      div.querySelector('.delete').addEventListener('click', e => {
        if (confirm('Vere forigi?')) {
          up.send({ do: 'deleteplayer', player: pl })
        }
      })
      div.querySelector('.name').textContent = pl.name
      div.querySelector('.xp').textContent = pl.xp
      let skills = div.querySelector('.skills')
      for (let sk of pl.skills) {
        let sdiv = skillTmpl()
        sdiv.textContent = `${sk.name} (${sk.level})`
        sdiv.addEventListener('click', e => {
          up.send({
            do: 'makeaction',
            player: pl,
            skill: sk,
          })
        })
        skills.append(sdiv)
      }
      list.append(div)
    }
  }

  return { onCommand, onUpdate }
}

function makeStoryBox(_data, up) {
  let seen = 0
  let div = document.querySelector('.story')
  let list = div.querySelector('.list')
  let eventTmpl = getTemplate('#eventtemplate')

  ;(() => {
    let addButton = div.querySelector('.add')
    addButton.addEventListener('click', e => {
      up.send({ do: 'newevent' })
    })
  })()

  let onUpdate = s => {
    if (s.events.length > seen) {
      for (; seen < s.events.length; seen++) {
        let ev = s.events[seen]
        let ediv = eventTmpl()
        ediv.textContent = ev.text
        ediv.style.opacity = 0
        list.append(ediv)
        ediv.scrollIntoView()
        ediv.style.opacity = 1
      }
    }
  }

  return { onUpdate }
}

function makeNewEventBox(_data, up) {
  let div = document.querySelector('.newevent')
  let form = div.querySelector('form')
  let textBox = form.querySelector('[name=text]')

  ;(() => {
    form.addEventListener('submit', e => {
      e.preventDefault()
      let text = textBox.value
      if (!text) {
        return
      }
      doMake(text)
      close()
    })
    form.querySelector('[name=cancel]').addEventListener('click', e => {
      e.preventDefault()
      close()
    })
  })()

  let doMake = text => {
    text.split('\n\n').forEach(e => {
      up.send({
        do: 'insertevent',
        text: e,
      })
    })
  }

  let setup = c => {
    div.classList.add('open')
  }

  let close = () => {
    div.classList.remove('open')
    form.reset()
  }

  let onCommand = c => {
    if (c.do === 'newevent') {
      setup(c)
    }
  }

  return { onCommand }
}

function makeNewPlayerBox(_data, up) {
  let div = document.querySelector('.newplayer')
  let form = div.querySelector('form')
  let nameBox = form.querySelector('[name=name]')

  let state = null

  ;(() => {
    form.addEventListener('submit', e => {
      e.preventDefault()
      let name = nameBox.value
      if (!name) {
        return
      }
      up.send({
        do: 'addplayer',
        name: name,
      })
      close()
    })
    form.querySelector('[name=cancel]').addEventListener('click', e => {
      e.preventDefault()
      close()
    })
  })()

  let setup = c => {
    state = c
    div.classList.add('open')
  }

  let close = () => {
    div.classList.remove('open')
    state = null
    form.reset()
  }

  let onCommand = c => {
    if (c.do === 'makeplayer') {
      setup(c)
    }
  }

  return { onCommand }
}

function makeMakeActionBox(_data, up) {
  let div = document.querySelector('.makeaction')
  let form = div.querySelector('form')

  let state = null

  ;(() => {
    form.addEventListener('submit', e => {
      e.preventDefault()
      let f = new FormData(form)
      let name = f.get("name")
      if (!name) {
        return
      }
      let difficulty = parseInt(f.get("difficulty"))
      doTry(name, difficulty)
      close()
    })
    form.querySelector('[name=cancel]').addEventListener('click', e => {
      e.preventDefault()
      close()
    })
  })()

  let doTry = (name, difficulty) => {
    up.send({
      do: 'tryaction',
      player: state.player,
      skill: state.skill,
      name: name,
      difficulty: difficulty,
    })
  }

  let setup = c => {
    state = c
    let m = `${state.player.name} povas ${state.skill.name} (${state.skill.level}), ĉu li ankaŭ povas ...`
    form.querySelector('.status').textContent = m
    div.classList.add('open')
  }

  let close = () => {
    div.classList.remove('open')
    state = null
    form.reset()
  }

  let onCommand = c => {
    if (c.do === 'makeaction') {
      setup(c)
    }
  }

  return { onCommand }
}

function makeTryActionBox(_data, up) {
  let div = document.querySelector('.tryaction')
  let result = div.querySelector('.result')

  let statusBox = result.querySelector('.status')
  let diceBox = result.querySelector('.diceroll')
  let diceBoxFor = diceBox.querySelector('.for')
  let diceBoxAgainst = diceBox.querySelector('.against')
  let diceBoxSuccess = diceBox.querySelector('.success')
  let inputBox = result.querySelector('.input')

  let appearOrder = [statusBox, diceBox, diceBoxFor, diceBoxAgainst, diceBoxSuccess, inputBox]

  let form = inputBox.querySelector('form')
  let nextBox = form.querySelector('[name=next]')

  ;(() => {
    form.addEventListener('submit', e => {
      e.preventDefault()
      let f = new FormData(form)
      let next = f.get("next")
      if (!next) {
        return
      }
      let skill = f.get("skill")
      doFinish(next, skill)
      close()
    })
  })()

  let close = () => {
    div.classList.remove('open')
    form.reset()
  }

  let doFinish = (text, skill) => {
    up.send({
      do: 'finishaction',
      text: text,
      skill: skill,
    })
  }

  let makeDiceString = ns => {
    let s = ''
    for (let n of ns) {
      s += diceEmojis[n-1] + ' '
    }
    return s
  }

  let makeFaceString = n => {
    let p = (n+2) * 2
    return faceEmojis.substring(p, p+2)
  }

  let tweakActionText = action => {
    let space0 = action.indexOf(' ')
    if (space0 === -1) {
      space0 = action.length
    }
    let word0 = action.slice(0, space0)
    if (word0.endsWith('i')) {
      word0 = word0.slice(0 , -1) + 'as'
      action = word0 + action.slice(space0)
    } else if (word0.endsWith('o')) {
      word0 = word0 + 'n'
      action = 'faras ' + word0 + action.slice(space0)
    }
    return action
  }

  let insertContent = s => {
    let attempt = s.attempt

    let m = `${attempt.action.player.name} provas ${attempt.action.name}, per '${attempt.action.skill.name}' je nivelo ${attempt.action.skill.level}`
    result.querySelector('.status').textContent = m

    let success = attempt.result.success

    result.querySelector('.for').textContent = makeDiceString(attempt.result.diceFor)
    result.querySelector('.against').textContent = makeDiceString(attempt.result.diceAgainst)
    result.querySelector('.success').textContent = makeFaceString(success)

    let player = attempt.action.player
    let action = attempt.action.name

    let text = `${player.name} `

    if (success == 2) {
      text += `tute sukcese ${tweakActionText(action)}`
    } else if (success == 1) {
      text += tweakActionText(action)
    } else if (success == 0) {
      text += `iom sukcese ${tweakActionText(action)}`
    } else {
      if (success == -1) {
        text += `sensukcese provas ${action}`
      } else {
        text += `tute fuŝas provon ${action}`
      }
      if (attempt.result.xp > 0) {
        text += `, sed gajnas ${attempt.result.xp} spert-poentojn`
      }
    }
    if (attempt.result.freeSkill) {
      text += `, kaj gajnos novan kapablon`
    } else if (attempt.result.paidSkill) {
      text += `, kaj rajtas aĉeti kapablon`
    }
    text += ', kaj ...'
    nextBox.value = text

    div.classList.toggle('newskill', attempt.result.freeSkill || attempt.result.paidSkill)
  }

  let showPieces = () => {
    let f = () => {
      for (let e of appearOrder) {
        if (e.style.display == 'none') {
          e.style.display = e.style.wantDisplay
          return
        }
      }
      clearInterval(t)
    }
    let t = setInterval(f, 1000)
  }

  let onUpdate = s => {
    if (s.attempt) {
      insertContent(s)
      showPieces()
      div.classList.add('open')
    } else {
      div.classList.remove('open')
      for (let e of appearOrder) {
        e.style.wantDisplay = e.style.display
        e.style.display = 'none'
      }
    }
  }

  return { onUpdate }
}

// there is no server, so this does it.
function makeKernel() {
  let state = {
    players: [],
    time: 0,
    attempt: null,
    events: [],
  }

  {
    let playersS = localStorage.getItem('players')
    if (playersS) {
      state.players = JSON.parse(playersS)
      // migrations
      for (let pl of state.players) {
        if (!pl.xp) {
          pl.xp = 0
        }
      }
    }
  }

  let sendUpdate = () => {}

  let setUpdateFunction = f => {
    sendUpdate = f
  }

  let doAddPlayer = c => {
    state.players.push({
      name: c.name,
      xp: 0,
      skills: [
        { name: 'fari ion', level: 1 },
      ],
    })
    localStorage.setItem('players', JSON.stringify(state.players))
    sendUpdate(state)
  }

  let doDeletePlayer = c => {
    let i = state.players.findIndex(e => e == c.player)
    if (i >= 0) {
      state.players.splice(i, 1)
      localStorage.setItem('players', JSON.stringify(state.players))
      sendUpdate(state)
    }
  }

  let doInsertEvent = c => {
    let time = state.time
    state.time = time + 1

    state.events.push({
      time: time,
      text: c.text,
    })

    sendUpdate(state)
  }

  let multiRoll = n => {
    let rolls = []
    for (let i = 0; i < n; i++) {
      let v = roll(6)
      rolls.push(v)
    }
    return rolls
  }

  let doTryAction = c => {
    if (state.attempt) {
      alert('error 1')
      return
    }

    let time = state.time
    state.time = time + 1

    let yRolls = multiRoll(c.skill.level)
    let nRolls = multiRoll(c.difficulty)

    let maxWin = yRolls.length*6 - nRolls.length*1
    let maxLoss = -(yRolls.length*1 - nRolls.length*6)

    let ySum = yRolls.reduce((accum, value) => accum + value, 0)
    let nSum = nRolls.reduce((accum, value) => accum + value, 0)

    let success = 0

    let diff = ySum - nSum
    if (diff > 0) {
      success = diff / maxWin
      success = Math.ceil(2*success)
    } else if (diff == 0) {
      success = 0
    } else {
      success = diff / maxLoss
      success = Math.floor(2*success)
    }

    // free skill is when all sixes are thrown
    let freeSkill = ySum == 6*c.skill.level
    // paid skill is when an xp can be spent, so need at least as many XP as there are non-sixes
    let notSixes = yRolls.reduce((accum, value) => accum += (value == 6 ? 0 : 1), 0)
    let paidSkill = !freeSkill && ySum == (6*c.skill.level)-1 && c.player.xp >= notSixes
  
    // xp is just 1 if not success
    let xp = success < 0 ? 1 : 0

    state.attempt = {
      time: time,
      action: {
        player: c.player,
        skill: c.skill,
        name: c.name,
      },
      result: {
        diceFor: yRolls,
        diceAgainst: nRolls,
        success: success,
        xp: xp,
        freeSkill: freeSkill,
        paidSkill: paidSkill,
      },
      skillCost: notSixes,
    }

    sendUpdate(state)
  }

  let doFinishAction = c => {
    let attempt = state.attempt
    if (attempt) {
      attempt.text = c.text
      state.events.push(attempt)
      if (attempt.result.xp > 0) {
        attempt.action.player.xp += attempt.result.xp
        localStorage.setItem('players', JSON.stringify(state.players))
      }
      if (attempt.result.freeSkill && c.skill) {
        let newSkill = {
          name: c.skill,
          level: attempt.action.skill.level + 1
        }
        attempt.action.player.skills.push(newSkill)
        localStorage.setItem('players', JSON.stringify(state.players))
      }
      if (attempt.result.paidSkill && c.skill) {
        let newSkill = {
          name: c.skill,
          level: attempt.action.skill.level + 1
        }
        attempt.action.player.skills.push(newSkill)
        attempt.action.player.xp -= attempt.skillCost
        localStorage.setItem('players', JSON.stringify(state.players))
      }
    }
    state.attempt = null
    sendUpdate(state)
  }

  let makeComponent = (_data, up) => {
    let onCommand = c => {
      if (c.do === 'addplayer') {
        doAddPlayer(c)
      } else if (c.do === 'deleteplayer') {
        doDeletePlayer(c)
      } else if (c.do === 'insertevent') {
        doInsertEvent(c)
      } else if (c.do  === 'tryaction') {
        doTryAction(c)
      } else if (c.do === 'finishaction') {
        doFinishAction(c)
      }
    }

    let onUpdate = s => {
      // if this is triggered by something other than us, something is strange.
    }

    return { onCommand, onUpdate }
  }

  let start = () => {
    sendUpdate(state)
  }

  return { setUpdateFunction, makeComponent, start }
}

function setup() {
  let server = makeKernel()

  let ui = newUI()
  window.ui = ui

  server.setUpdateFunction(s => {
    window.setTimeout(() => ui.onUpdate(s), 0)
  })

  ui.addComponent(server.makeComponent)
  ui.addComponent(makePlayersList)
  ui.addComponent(makeNewPlayerBox)
  ui.addComponent(makeStoryBox)
  ui.addComponent(makeNewEventBox)
  ui.addComponent(makeMakeActionBox)
  ui.addComponent(makeTryActionBox)

  server.start()

  return ui
}

function main() {
  setup()
}

document.addEventListener('DOMContentLoaded', main)
