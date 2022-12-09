import { Message, WechatyBuilder } from 'wechaty'
import { XMLParser } from 'fast-xml-parser'
import axios from 'axios'
import { IBotInfo, InfoType, MessageType, Status } from './bot.interface'


const parser = new XMLParser()

// axios.defaults.baseURL = 'http://localhost:3000'

const getDefaultBotInfo = (type: InfoType): IBotInfo => {
  return {
    type,
    status: Status.INACTIVE,
    memo: false,
  }
}

const botInfos: { [id in string]: IBotInfo } = {}

const wechaty = WechatyBuilder.build({
  puppetOptions: {
    uos: true  // 开启uos协议
  },
  puppet: 'wechaty-puppet-wechat',
})
wechaty
  .on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`))
  .on('login', user => console.log(`User ${user} logged in`))
  .on('message', message => {
    if (message.self()) { return }
    const type = message.type()
    const id = getBotInfoId(message)
    initBotInfo(id, message.room() ? InfoType.ROOM : InfoType.PERSONAL)
    // axios.get('/api/v1/tests/connection').then((res) => {
    //   console.log('requestRes', res.data)
    // })
    if (type === MessageType.Text) {
      processTextMessage(message)
    } else if (type === MessageType.Url) {
      processUrlMessage(message)
    }
  })
wechaty.start()

const processTextMessage = (message: Message) => {
  const text = message.text()
  const id = getBotInfoId(message)
  console.log(`${message.talker().name()}: ${message.text()}`)
  if (checkSummon(message)) {
    botInfos[id].status = Status.ACTIVE
    message.say('我来啦~')
  } else if (checkExit(message)) {
    if (botInfos[id].status === Status.ACTIVE) {
      message.say('我走啦')
      botInfos[id].status = Status.INACTIVE
    }
  } else if (botInfos[id].status === Status.ACTIVE) {
    axios.post('http://localhost:3389/generate', {
      data: [text]
    }).then((res) => {
      console.log(res.data)
      message.say(res.data)
    })
  }
}

const processUrlMessage = (message: Message) => {
  const text = message.text()
  const parsedText = parser.parse(text)
  if (!parsedText) { return }
  const msg = parsedText.msg
  if (!msg) { return }
  const appName = msg.appinfo?.appname
  const title = msg.appmsg?.title
  const url = msg.appmsg?.url
  console.log(appName, title, url)
}

const checkSummon = (message: Message) => {
  const text = message.text()
  return text.startsWith('！！召唤机器人')
}

const checkExit = (message: Message) => {
  const text = message.text()
  return text.startsWith('退下')
}

const getBotInfoId = (message: Message): string => {
  const room = message.room()
  return room ? room.id : message.talker().id
}

const initBotInfo = (id: string, type: InfoType) => {
  if (botInfos[id]) { return }
  botInfos[id] = getDefaultBotInfo(type)
}
