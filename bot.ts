import { Message, WechatyBuilder } from 'wechaty'
import { XMLParser } from 'fast-xml-parser'
import * as PUPPET from 'wechaty-puppet'
import axios from 'axios'



const parser = new XMLParser()

axios.defaults.baseURL = 'http://localhost:3000'

const wechaty = WechatyBuilder.build() // get a Wechaty instance
wechaty
  .on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`))
  .on('login', user => console.log(`User ${user} logged in`))
  .on('message', message => {
    const text = message.text()
    const type = message.type()
    axios.get('/api/v1/tests/connection').then((res) => {
      console.log('requestRes', res.data)
    })
    if (text.startsWith('@Harvey')) {
      console.log(message.text())
      message.say(`你刚刚说了：${text.slice(3)}`)
    }
    // if (message.from().name === '蒜蓉海鲜酱') {
    // }
    if (type === PUPPET.types.Message.Text) {
      processTextMessage(message)
    } else if (type === PUPPET.types.Message.Url) {
      processUrlMessage(message)
    }
  })
wechaty.start()

const processTextMessage = (message: Message) => {
  console.log('xxx', message.text())
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
