// 封装 message 方法
import { message } from 'ant-design-vue'

message.config({
  maxCount: 10,
})

//
export const showMessage = (content, type, duration = 3) => {
  message[type](content, duration)
}
