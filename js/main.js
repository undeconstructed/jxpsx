
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
    console.log('command', cmd)
    for (let c of components) {
      c.onCommand && c.onCommand(cmd)
    }
  }

  let dumpState = () => {
    console.log(state)
  }

  let onUpdate = u => {
    console.log('rxu', JSON.stringify(u))
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
      div.querySelector('.name').textContent = pl.name
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

function makeStoryBox(_data, _up) {
  let seen = 0
  let div = document.querySelector('.story')
  let list = div.querySelector('.list')
  let eventTmpl = getTemplate('#eventtemplate')

  let onUpdate = s => {
    if (s.events.length > seen) {
      for (; seen < s.events.length; seen++) {
        let ev = s.events[seen]
        let ediv = eventTmpl()
        if (ev.text) {
          ediv.textContent = `Je ${ev.time}, ${ev.text}`
        } else {
          ediv.textContent = `Je ${ev.time}, ${ev.player.name}, faras ${ev.name}.`
        }
        list.append(ediv)
        ediv.scrollIntoView()
      }
    }
  }

  return { onUpdate }
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
  let nameBox = form.querySelector('[name=name]')

  let state = null

  ;(() => {
    form.addEventListener('submit', e => {
      e.preventDefault()
      let name = nameBox.value
      if (!name) {
        return
      }
      doTry(name)
      close()
    })
    form.querySelector('[name=cancel]').addEventListener('click', e => {
      e.preventDefault()
      close()
    })
  })()

  let doTry = name => {
    up.send({
      do: 'tryaction',
      player: state.player,
      skill: state.skill,
      name: name,
    })
  }

  let setup = c => {
    state = c
    let m = `Ago de ${state.player.name} per '${state.skill.name}' je nivelo ${state.skill.level}:`
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
  let form = div.querySelector('form')

  ;(() => {
    form.addEventListener('submit', e => {
      e.preventDefault()
      let next = form.querySelector('[name=next]').value
      if (!next) {
        return
      }
      doFinish(next)
      close()
    })
  })()

  let doFinish = (text) => {
    up.send({
      do: 'finishaction',
      text: text,
    })
  }

  let onUpdate = s => {
    if (s.attempt) {
      let attempt = s.attempt
      div.classList.add('open')

      let m = `${attempt.action.player.name} provas ${attempt.action.name}, per '${attempt.action.skill.name}' je nivelo ${attempt.action.skill.level}`
      result.querySelector('.status').textContent = m

      result.querySelector('.for').textContent = attempt.result.diceFor
      result.querySelector('.against').textContent = attempt.result.diceAgainst

      let next = form.querySelector('[name=next]')
      if (attempt.result.success) {
        next.value = `${attempt.action.player.name} sukcese faras ${attempt.action.name}, kaj ...`
      } else {
        next.value = `${attempt.action.player.name} sensukcese provas ${attempt.action.name}.`
      }
    } else {
      div.classList.remove('open')
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

  let sendUpdate = () => {}

  let setUpdateFunction = f => {
    sendUpdate = f
  }

  let doAddPlayer = c => {
    state.players.push({
      name: c.name,
      skills: [
        { name: 'fari ion', level: 1 },
      ],
    })
    sendUpdate(state)
  }

  let multiRoll = n => {
    let sum = 0
    let str = ''
    for (let i = 0; i < n; i++) {
      let v = roll(6)
      sum += v
      str += v + ' '
    }
    return [sum, str]
  }

  let doTryAction = c => {
    let time = state.time
    state.time = time + 1
    let [ySum, yStr] = multiRoll(c.skill.level)
    let [nSum, nStr] = multiRoll(c.skill.level)
    state.attempt = {
      time: time,
      action: {
        player: c.player,
        skill: c.skill,
        name: c.name,
      },
      result: {
        diceFor: yStr,
        diceAgainst: nStr,
        success: ySum > nSum,
      }
    }
    sendUpdate(state)
  }

  let doFinishAction = c => {
    if (state.attempt) {
      state.attempt.text = c.text
      state.events.push(state.attempt)
      state.attempt = null
    }
    sendUpdate(state)
  }

  let makeComponent = (_data, up) => {
    let onCommand = c => {
      if (c.do === 'addplayer') {
        doAddPlayer(c)
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

  return { setUpdateFunction, makeComponent }
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
  ui.addComponent(makeMakeActionBox)
  ui.addComponent(makeTryActionBox)

  return ui
}

function main() {
  setup()
}

document.addEventListener('DOMContentLoaded', main)
