
function getTemplate(selector) {
  let t = document.querySelector(selector).content.firstElementChild
  return () => {
    return t.cloneNode(true)
  }
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
        ediv.textContent = `Je ${ev.time}, ${ev.player.name}, faras ${ev.name}.`
        list.append(ediv)
        ediv.scrollIntoView()
      }
    }
  }

  return { onUpdate }
}

function makeNewPlayerBox(_data, up) {
  let onCommand = c => {
    if (c.do === 'makeplayer') {
      let m = prompt('Nomo:')
      if (!m) {
        return
      }
      up.send({
        do: 'addplayer',
        name: m,
      })
    }
  }

  return { onCommand }
}

function makeDoSomethingBox(_data, up) {
  let onCommand = c => {
    if (c.do === 'makeaction') {
      let skill = c.skill
      let m = prompt(`Ago de ${c.player.name} per '${skill.name}' je nivelo ${skill.level}:`)
      if (!m) {
        return
      }
      up.send({
        do: 'action',
        player: c.player,
        skill: skill,
        name: m,
      })
    }
  }

  return { onCommand }
}

// there is no server, so this does it.
function makeKernel() {
  let state = {
    players: [],
    time: 0,
    events: [],
  }

  let sendUpdate = () => {}

  let setUpdateFunction = f => {
    sendUpdate = f
  }

  let makeComponent = (_data, up) => {
    let onCommand = c => {
      if (c.do === 'addplayer') {
        state.players.push({
          name: c.name,
          skills: [
            { name: 'fari ion', level: 1 },
          ],
        })
        sendUpdate(state)
      } else if (c.do  === 'action') {
        let time = state.time
        state.events.push({
          time: time,
          player: c.player,
          skill: c.skill,
          name: c.name,
        })
        state.time = time + 1
        sendUpdate(state)
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
  ui.addComponent(makeDoSomethingBox)

  return ui
}

function main() {
  setup()
}

document.addEventListener('DOMContentLoaded', main)
