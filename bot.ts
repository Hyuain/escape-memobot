import { Message, WechatyBuilder } from 'wechaty'
import { XMLParser } from 'fast-xml-parser'
import axios from 'axios'
import { IConversationInfo, ConversationType, MessageType, Status, IConversationTextHistory } from './bot.interface'


const parser = new XMLParser()

const HISTORY_MAX_LENGTH = 10
const CHITCHAT_MAX_LENGTH = 3
const CHITCHAT_MAX_TIME = 3 * 60 * 1000

// axios.defaults.baseURL = 'http://localhost:3000'

const getDefaultConversationInfo = (type: ConversationType): IConversationInfo => {
  return {
    type,
    status: Status.INACTIVE,
    memo: false,
    textHistory: [],
  }
}

const conversationInfos: { [id in string]: IConversationInfo } = {}

const wechaty = WechatyBuilder.build({
  puppetOptions: {
    uos: true,  // 开启uos协议
  },
  puppet: 'wechaty-puppet-wechat',
})
wechaty
  .on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`))
  .on('login', (user) => console.log(`User ${user} logged in`))
  .on('message', async (message) => {
    const type = message.type()
    const id = await getConversationId(message)
    initConversationInfo(id, message.room() ? ConversationType.ROOM : ConversationType.PERSONAL)
    await addMessageToHistory(message)
    if (message.self()) { return }
    // axios.get('/api/v1/tests/connection').then((res) => {
    //   console.log('requestRes', res.data)
    // })
    console.log(`${message.talker().name()}: ${message.text()}`)
    console.log(`history: ${conversationInfos[id].textHistory}`)
    if (type === MessageType.Text) {
      processTextMessage(message)
    } else if (type === MessageType.Url) {
      processUrlMessage(message)
    }
  })
  .on('heartbeat', (x) => {
    console.log(new Date(), 'heartBeat', x)
  })
  .on('error', err => {
    console.log('xxxBotError', err)
  })
wechaty.start()

const processTextMessage = async (message: Message) => {
  const text = message.text()
  const id = await getConversationId(message)
  if (checkSummon(message)) {
    conversationInfos[id].status = Status.ACTIVE
    message.say('我来啦~')
  } else if (checkExit(message)) {
    if (conversationInfos[id].status === Status.ACTIVE) {
      message.say('我走啦')
      conversationInfos[id].status = Status.INACTIVE
    }
  } else if (conversationInfos[id].status === Status.ACTIVE) {
    try {
      const data = getTextsSendToChitchat(conversationInfos[id].textHistory)
      console.log('xxxSendToChitchat', data)
      const res = await axios.post('http://localhost:3389/generate', { data })
      console.log(res.data)
      message.say(res.data)
    } catch (e) {
      console.log('xxxGenerateError', e)
    }
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

const getConversationId = async (message: Message): Promise<string> => {
  const room = message.room()
  return room ? room.topic() : message.talker().name()
}

const initConversationInfo = (id: string, type: ConversationType) => {
  if (conversationInfos[id]) { return }
  conversationInfos[id] = getDefaultConversationInfo(type)
}

const addMessageToHistory = async (message: Message) => {
  const id = await getConversationId(message)
  if (message.type() !== MessageType.Text) { return }
  const textHistory = conversationInfos[id].textHistory
  textHistory.push({
    time: new Date(),
    text: message.text(),
  })
  if (textHistory.length > HISTORY_MAX_LENGTH) {
    textHistory.splice(0, textHistory.length - HISTORY_MAX_LENGTH)
  }
}

const getTextsSendToChitchat = (textHistory: IConversationTextHistory[]): string[] => {
  const texts = textHistory.filter((history) => {
    return history.time.getTime() > Date.now() - CHITCHAT_MAX_TIME
  })
  if (texts.length > CHITCHAT_MAX_LENGTH) {
    texts.splice(0, texts.length - CHITCHAT_MAX_LENGTH)
  }
  return texts.map((item) => item.text)
}
